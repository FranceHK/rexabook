"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { businessIdFor, getBusinessOwner, requireActiveBusinessUser } from "@/lib/auth";
import { customerCreateSchema, customerUpdateSchema } from "@/lib/validation";
import { formDataToObject, parseZod, fail, type ActionResult } from "@/lib/action-result";
import { buildKumbushoSMS, buildMtejaMpyaSMS, tumaSMS } from "@/lib/sms";
import { bakaa as bakaaOf, toMoney } from "@/lib/format";
import { DASHBOARD_CACHE_TAG } from "@/lib/cache-tags";
import { countSmsUnits } from "@/lib/sms-pricing";
import { writeAudit } from "@/lib/audit";

/** Replicates wateja_add.php – adds a new customer for the signed-in user. */
export async function createCustomerAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireActiveBusinessUser();
  const businessId = businessIdFor(user);
  const owner = await getBusinessOwner(user);

  const parsed = parseZod(customerCreateSchema, formDataToObject(formData));
  if (!parsed.success) return { success: false, message: parsed.message, fieldErrors: parsed.fieldErrors };

  const { jina, simu, location } = parsed.data!;

  try {
    const customer = await prisma.customer.create({
      data: {
        mtumiajiId: businessId,
        jina,
        simu: simu || null,
        location: location || null,
      },
    });
    await writeAudit({ businessId, actorUserId: user.id, action: "CUSTOMER_CREATED", entity: "Customer", entityId: customer.id, details: { name: jina } });
  } catch {
    return fail("Imeshindikana kumhifadhi mteja. Jaribu tena.");
  }

  // Template #1 – welcome SMS to the new customer (best-effort)
  if (simu) {
    const ujumbe = buildMtejaMpyaSMS({
      jinaMteja: jina,
      jinaDuka: owner?.jina_duka ?? "Duka",
    });
    await tumaSMS(businessId, simu, ujumbe);
  }

  revalidatePath("/customers");
  revalidatePath("/dashboard");
  revalidateTag(DASHBOARD_CACHE_TAG);
  return { success: true, message: `Mteja "${jina}" ameongezwa.` };
}

/** Replicates mteja_update.php – edits customer details (ownership enforced). */
export async function updateCustomerAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireActiveBusinessUser();
  const businessId = businessIdFor(user);

  const parsed = parseZod(customerUpdateSchema, formDataToObject(formData));
  if (!parsed.success) return { success: false, message: parsed.message, fieldErrors: parsed.fieldErrors };

  const { mteja_id, jina, simu, location } = parsed.data!;

  const owned = await prisma.customer.count({
    where: { id: mteja_id, mtumiajiId: businessId },
  });
  if (owned === 0) return fail("Mteja hapatikani.");

  try {
    await prisma.customer.update({
      where: { id: mteja_id },
      data: { jina, simu: simu || null, location: location || null },
    });
  } catch {
    return fail("Imeshindikana kusasisha mteja. Jaribu tena.");
  }
  await writeAudit({ businessId, actorUserId: user.id, action: "CUSTOMER_UPDATED", entity: "Customer", entityId: mteja_id });

  revalidatePath("/customers");
  revalidatePath(`/customers/${mteja_id}`);
  revalidateTag(DASHBOARD_CACHE_TAG);
  return { success: true, message: "Taarifa za mteja zimesasishwa." };
}

export async function setCustomerBlockedAction(customerId: number, blocked: boolean): Promise<ActionResult> {
  const user = await requireActiveBusinessUser();
  const businessId = businessIdFor(user);
  if (!Number.isSafeInteger(customerId) || customerId <= 0) return fail("Mteja si sahihi.");

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, mtumiajiId: businessId },
    select: { id: true, jina: true },
  });
  if (!customer) return fail("Mteja hapatikani.");

  await prisma.customer.update({
    where: { id: customer.id },
    data: { imezuiwa: blocked },
  });
  await writeAudit({ businessId, actorUserId: user.id, action: blocked ? "CUSTOMER_BLOCKED" : "CUSTOMER_UNBLOCKED", entity: "Customer", entityId: customer.id });

  revalidatePath("/customers");
  revalidatePath(`/customers/${customer.id}`);
  revalidatePath("/dashboard");
  revalidateTag(DASHBOARD_CACHE_TAG);

  return {
    success: true,
    message: blocked
      ? `${customer.jina} amezuiwa na kufichwa kwenye orodha ya kawaida.`
      : `${customer.jina} amerudishwa kwenye orodha ya wadaiwa.`,
  };
}

export async function sendDebtReminderAction(customerId: number): Promise<ActionResult> {
  const user = await requireActiveBusinessUser();
  const businessId = businessIdFor(user);
  const owner = await getBusinessOwner(user);
  if (!Number.isSafeInteger(customerId) || customerId <= 0) return fail("Mteja si sahihi.");

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, mtumiajiId: businessId },
    include: {
      debts: {
        where: { imekamilika: false },
        orderBy: { tareheKukopa: "asc" },
      },
    },
  });

  if (!customer) return fail("Mteja hapatikani.");
  if (!customer.simu) return fail("Ongeza namba ya simu ya mteja kabla ya kutuma ukumbusho.");

  const activeDebts = customer.debts.filter(
    (debt) => bakaaOf(toMoney(debt.kiasiAsili), toMoney(debt.kiasiKilicholipwa)) > 0
  );
  if (activeDebts.length === 0) return fail("Mteja huyu hana deni linaloendelea.");

  const deniLililobaki = activeDebts.reduce(
    (sum, debt) => sum + bakaaOf(toMoney(debt.kiasiAsili), toMoney(debt.kiasiKilicholipwa)),
    0
  );
  const bidhaaZilizobaki = activeDebts.map((debt) => debt.jinaBidhaa?.trim() || "Deni");
  const ujumbe = buildKumbushoSMS({
    jinaMteja: customer.jina,
    jinaDuka: owner?.jina_duka ?? "Duka",
    deniLililobaki,
    yanayoendelea: activeDebts.length,
    bidhaaZilizobaki,
  });

  const units = countSmsUnits(ujumbe);
  if (!owner?.smsEnabled) return fail("SMS zimezimwa. Ziwashe kwanza kwenye Mipangilio.");
  if (owner.smsBalance < units) {
    return fail(`Salio halitoshi. Ujumbe huu unahitaji SMS ${units}, lakini una ${owner.smsBalance}.`);
  }

  const sent = await tumaSMS(businessId, customer.simu, ujumbe);
  if (sent) {
    await writeAudit({ businessId, actorUserId: user.id, action: "DEBT_REMINDER_SENT", entity: "Customer", entityId: customer.id, details: { smsUnits: units } });
  }
  revalidatePath(`/customers/${customer.id}`);

  return sent
    ? { success: true, message: `Ukumbusho wa deni umetumwa kwa ${customer.jina}.` }
    : fail("SMS haijatumwa. Kagua mipangilio ya huduma ya SMS kisha ujaribu tena.");
}
