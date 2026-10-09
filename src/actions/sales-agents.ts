"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { compare, hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin, requireSales } from "@/lib/auth";
import { fail, parseZod, type ActionResult } from "@/lib/action-result";
import { passwordSchema } from "@/lib/validation";

// No 0/O/1/I so a code read out over the phone cannot be mistyped.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomChars(length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

function newReferralCode(): string {
  return `RX${randomChars(5)}`;
}

/** Login details the admin copies into an SMS; the password is shown once and never stored in plain text. */
export interface SalesCredentials {
  username: string;
  password: string;
  code: string;
}

export type SalesCredentialsResult = ActionResult & { credentials?: SalesCredentials };

export async function createSalesPersonAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<SalesCredentialsResult> {
  await requireAdmin();
  const username = String(formData.get("jina") ?? "").trim();
  const phone = String(formData.get("simu") ?? "").trim();
  const password = randomChars(8);
  if (!username || username.length > 100) return fail("Weka jina la kuingia la sales person.");
  if (phone.length > 20) return fail("Namba ya simu ni ndefu mno.");
  if (await prisma.user.findFirst({ where: { jina: { equals: username, mode: "insensitive" } } })) return fail("Jina hilo tayari linatumika.");

  const nenosiri = await hash(password, 10);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const referralCode = newReferralCode();
    try {
      await prisma.user.create({
        data: { jina: username, nenosiri, jina_duka: "RexaBook Sales", simu: phone || null, role: "SALES", referralCode, mustChangePassword: true },
      });
      revalidatePath("/admin/sales");
      return { success: true, message: `${username} ameongezwa. Nakili ujumbe wake umtumie.`, credentials: { username, password, code: referralCode } };
    } catch (error) {
      const duplicateCode = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
        && String(error.meta?.target ?? "").includes("referralCode");
      if (!duplicateCode) break;
    }
  }
  return fail("Imeshindikana kuunda sales person. Jaribu tena.");
}

export async function toggleSalesPersonAction(salesUserId: number): Promise<ActionResult> {
  await requireAdmin();
  const sales = await prisma.user.findFirst({ where: { id: salesUserId, role: "SALES" } });
  if (!sales) return fail("Sales person hapatikani.");
  const updated = await prisma.user.update({ where: { id: sales.id }, data: { isActive: !sales.isActive } });
  revalidatePath("/admin/sales");
  return { success: true, message: updated.isActive ? `${sales.jina} ameruhusiwa kuingia.` : `${sales.jina} amezuiwa kuingia.` };
}

/** Replaces the password with a new temporary one so the admin can send fresh login details. */
export async function resetSalesPasswordAction(salesUserId: number): Promise<SalesCredentialsResult> {
  await requireAdmin();
  const sales = await prisma.user.findFirst({ where: { id: salesUserId, role: "SALES" } });
  if (!sales) return fail("Sales person hapatikani.");
  const password = randomChars(8);
  await prisma.user.update({
    where: { id: sales.id },
    data: { nenosiri: await hash(password, 10), mustChangePassword: true },
  });
  revalidatePath("/admin/sales");
  return {
    success: true,
    message: `Nenosiri jipya la ${sales.jina} limetengenezwa. Nakili ujumbe umtumie.`,
    credentials: { username: sales.jina, password, code: sales.referralCode ?? "-" },
  };
}

/** Records that the admin has paid out every commission the sales person was still owed. */
export async function markCommissionsPaidAction(salesUserId: number): Promise<ActionResult> {
  await requireAdmin();
  const sales = await prisma.user.findFirst({ where: { id: salesUserId, role: "SALES" }, select: { jina: true } });
  if (!sales) return fail("Sales person hapatikani.");
  const paid = await prisma.salesCommission.updateMany({
    where: { salesUserId, tareheKulipwa: null },
    data: { tareheKulipwa: new Date() },
  });
  if (paid.count === 0) return fail("Hakuna commission inayosubiri kulipwa.");
  revalidatePath("/admin/sales");
  revalidatePath("/sales");
  return { success: true, message: `Commission ${paid.count} za ${sales.jina} zimewekwa kuwa zimelipwa.` };
}

/** Lets a sales person replace the starting password the admin gave them. */
export async function changeSalesPasswordAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const sales = await requireSales();
  const parsed = parseZod(passwordSchema, {
    la_zamani: formData.get("la_zamani"),
    jipya: formData.get("jipya"),
    thibitisha: formData.get("thibitisha"),
  });
  if (!parsed.success) return { success: false, message: parsed.message, fieldErrors: parsed.fieldErrors };

  const { la_zamani, jipya } = parsed.data!;
  if (!(await compare(la_zamani, sales.nenosiri))) return fail("Nenosiri lako la zamani si sahihi.");
  if (la_zamani === jipya) return fail("Nenosiri jipya liwe tofauti na la zamani.");

  try {
    await prisma.user.update({ where: { id: sales.id }, data: { nenosiri: await hash(jipya, 10), mustChangePassword: false } });
  } catch {
    return fail("Imeshindikana kubadilisha nenosiri. Jaribu tena.");
  }
  revalidatePath("/sales");
  revalidatePath("/admin/sales");
  return { success: true, message: "Nenosiri limebadilishwa." };
}

/** Lets a sales person keep their own login name and phone number up to date. */
export async function updateSalesProfileAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const sales = await requireSales();
  const username = String(formData.get("jina") ?? "").trim();
  const phone = String(formData.get("simu") ?? "").trim();
  if (!username || username.length > 100) return fail("Weka jina la kuingia.");
  if (phone.length > 20) return fail("Namba ya simu ni ndefu mno.");
  const taken = await prisma.user.findFirst({
    where: { jina: { equals: username, mode: "insensitive" }, id: { not: sales.id } },
    select: { id: true },
  });
  if (taken) return fail("Jina hilo tayari linatumika.");

  try {
    await prisma.user.update({ where: { id: sales.id }, data: { jina: username, simu: phone || null } });
  } catch {
    return fail("Imeshindikana kuhifadhi taarifa. Jaribu tena.");
  }
  revalidatePath("/sales");
  revalidatePath("/admin/sales");
  return { success: true, message: "Taarifa zako zimehifadhiwa." };
}
