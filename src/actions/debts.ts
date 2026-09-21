"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { debtCreateSchema, paymentSchema } from "@/lib/validation";
import { formDataToObject, parseZod, fail, type ActionResult } from "@/lib/action-result";
import { toMoney, parseDateInput, bakaa as bakaaOf } from "@/lib/format";
import { buildDeniSMS, buildMalipoSMS, tumaSMS } from "@/lib/sms";
import { DASHBOARD_CACHE_TAG } from "@/lib/cache-tags";

async function ensureOwnedDebt(userId: number, deniId: number) {
  return prisma.debt.findFirst({
    where: { id: deniId, mtumiajiId: userId },
    include: { customer: true },
  });
}

/** Replicates deni_add.php – adds a debt for a customer. */
export async function createDebtAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = parseZod(debtCreateSchema, formDataToObject(formData));
  if (!parsed.success) return { success: false, message: parsed.message, fieldErrors: parsed.fieldErrors };

  const { mteja_id, jina_bidhaa, kiasi, tarehe, maelezo } = parsed.data!;

  const tareheKukopa = parseDateInput(tarehe);
  if (!tareheKukopa) return fail("Tarehe si sahihi.");

  const owned = await prisma.customer.findFirst({
    where: { id: mteja_id, mtumiajiId: user.id },
  });
  if (!owned) return fail("Mteja hakupatikana.");

  try {
    await prisma.debt.create({
      data: {
        mtejaId: mteja_id,
        mtumiajiId: user.id,
        jinaBidhaa: jina_bidhaa,
        kiasiAsili: kiasi,
        kiasiKilicholipwa: 0,
        tareheKukopa,
        maelezo: maelezo || null,
        imekamilika: false,
      },
    });
  } catch {
    return fail("Imeshindikana kuongeza deni. Jaribu tena.");
  }

  // SMS notification for the new debt (best-effort)
  if (owned.simu) {
    const madeni = await prisma.debt.findMany({
      where: { mtejaId: mteja_id, mtumiajiId: user.id, imekamilika: false },
    });
    const jumlaDeni = madeni.reduce((sum, d) => sum + bakaaOf(d.kiasiAsili, d.kiasiKilicholipwa), 0);

    const ujumbe = buildDeniSMS({
      jinaMteja: owned.jina,
      bidhaa: jina_bidhaa,
      kiasi,
      maelezo: maelezo || undefined,
      jumlaDeni,
      jinaDuka: user.jina_duka ?? "Duka",
    });
    await tumaSMS(user.id, owned.simu, ujumbe);
  }

  revalidatePath("/dashboard");
  revalidateTag(DASHBOARD_CACHE_TAG);
  revalidatePath(`/customers/${mteja_id}`);
  return { success: true, message: `Deni "${jina_bidhaa}" limeongezwa.` };
}

/** Replicates deni_delete.php – deletes a debt and its payments. */
export async function deleteDebtAction(deniId: number): Promise<ActionResult> {
  const user = await requireUser();

  const deni = await prisma.debt.findFirst({
    where: { id: deniId, mtumiajiId: user.id },
  });
  if (!deni) return fail("Deni halipatikani.");

  await prisma.$transaction([
    prisma.payment.deleteMany({ where: { deniId } }),
    prisma.debt.delete({ where: { id: deniId } }),
  ]);

  revalidatePath("/dashboard");
  revalidateTag(DASHBOARD_CACHE_TAG);
  revalidatePath(`/customers/${deni.mtejaId || ""}`);
  return { success: true, message: "Deni limefutwa." };
}

/** Replicates malipo_add.php – records a payment, marks debt complete & sends SMS. */
export async function addPaymentAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = parseZod(paymentSchema, formDataToObject(formData));
  if (!parsed.success) return { success: false, message: parsed.message, fieldErrors: parsed.fieldErrors };

  const { deni_id, kiasi, maelezo } = parsed.data!;

  const deni = await ensureOwnedDebt(user.id, deni_id);
  if (!deni) return fail("Deni halipatikani.");
  if (deni.imekamilika) return fail("Deni hili tayari limelipwa kikamilifu.");

  const asili = toMoney(deni.kiasiAsili);
  const kilicholipwa = toMoney(deni.kiasiKilicholipwa);
  const bakaa = Math.max(0, asili - kilicholipwa);

  if (kiasi > bakaa + 0.001) {
    return fail(`Kiasi kinazidi kinachobaki. Kinachobaki ni TZS ${bakaa.toLocaleString("en-TZ", { maximumFractionDigits: 2 })}.`);
  }

  const kipyaKilicholipwa = kilicholipwa + kiasi;
  const imekamilika = kipyaKilicholipwa >= asili - 0.001;

  try {
    await prisma.$transaction([
      prisma.payment.create({
        data: { deniId: deni_id, kiasi, maelezo: maelezo || null },
      }),
      prisma.debt.update({
        where: { id: deni_id },
        data: { kiasiKilicholipwa: kipyaKilicholipwa, imekamilika },
      }),
    ]);
  } catch {
    return fail("Imeshindikana kuhifadhi malipo. Jaribu tena.");
  }

  // SMS notification (best-effort, mirrors malipo_add.php)
  const simuMteja = deni.customer?.simu;
  if (simuMteja && deni.mtumiajiId) {
    const userInfo = await prisma.user.findUnique({ where: { id: deni.mtumiajiId } });
    const madeniYote = await prisma.debt.findMany({
      where: { mtejaId: deni.mtejaId ?? undefined, imekamilika: false },
    });
    const jumlaMadeniYote = madeniYote.reduce((sum, d) => sum + bakaaOf(d.kiasiAsili, d.kiasiKilicholipwa), 0);

    const ujumbe = buildMalipoSMS({
      jinaMteja: deni.customer!.jina,
      malipoKiasi: kiasi,
      bidhaa: deni.jinaBidhaa ?? "deni",
      kiasiDeni: asili,
      bakaaBidhaa: Math.max(0, asili - kipyaKilicholipwa),
      jumlaMadeniYote,
      jinaDuka: userInfo?.jina_duka ?? "Duka",
    });
    await tumaSMS(user.id, simuMteja, ujumbe);
  }

  const ujumbe = imekamilika ? "Hongera! Deni limelipwa kikamilifu! 🎉" : "Malipo yamepokelewa.";

  revalidatePath("/dashboard");
  revalidateTag(DASHBOARD_CACHE_TAG);
  revalidatePath(`/customers/${deni.mtejaId || ""}`);

  return { success: true, message: ujumbe };
}
