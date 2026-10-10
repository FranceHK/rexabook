"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { compare, hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin, requireSales } from "@/lib/auth";
import { fail, parseZod, type ActionResult } from "@/lib/action-result";
import { passwordSchema } from "@/lib/validation";
import { isTanzaniaRegion } from "@/lib/regions";

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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Login details the admin copies into an SMS. The starter password is kept
 * readable (tempPassword) only until the sales person sets their own.
 */
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
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = randomChars(8);
  if (!username || username.length > 100) return fail("Weka jina la kuingia la sales person.");
  if (phone.length > 20) return fail("Namba ya simu ni ndefu mno.");
  if (email && (email.length > 150 || !EMAIL_PATTERN.test(email))) return fail("Email si sahihi.");
  if (await prisma.user.findFirst({ where: { jina: { equals: username, mode: "insensitive" } } })) return fail("Jina hilo tayari linatumika.");

  const nenosiri = await hash(password, 10);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const referralCode = newReferralCode();
    try {
      await prisma.user.create({
        data: { jina: username, nenosiri, jina_duka: "RexaBook Sales", simu: phone || null, email: email || null, role: "SALES", referralCode, tempPassword: password },
      });
      revalidatePath("/admin");
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
  revalidatePath("/admin");
  return { success: true, message: updated.isActive ? `${sales.jina} ameruhusiwa kuingia.` : `${sales.jina} amezuiwa kuingia.` };
}

/** Admin edits any sales person's details. */
export async function updateSalesPersonAction(salesUserId: number, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const sales = await prisma.user.findFirst({ where: { id: salesUserId, role: "SALES" }, select: { id: true } });
  if (!sales) return fail("Sales person hapatikani.");
  const parsed = await parseSalesProfile(formData, sales.id, false);
  if ("error" in parsed) return fail(parsed.error);
  await prisma.user.update({ where: { id: sales.id }, data: parsed.data });
  revalidatePath("/admin");
  revalidatePath("/sales");
  return { success: true, message: `Taarifa za ${parsed.data.jina} zimehifadhiwa.` };
}

/** Shared by the admin's edit and the sales person's own settings. `strict` demands the full profile. */
type SalesProfileData = { jina: string; jinaKamili: string | null; email: string | null; simu: string | null; mkoa: string | null };

async function parseSalesProfile(formData: FormData, salesUserId: number, strict: boolean): Promise<{ error: string } | { data: SalesProfileData }> {
  const jina = String(formData.get("jina") ?? "").trim();
  const jinaKamili = String(formData.get("jina_kamili") ?? "").trim().replace(/\s+/g, " ");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const simu = String(formData.get("simu") ?? "").trim();
  const mkoa = String(formData.get("mkoa") ?? "").trim();

  if (!jina || jina.length > 100) return { error: "Weka jina la kuingia." };
  if (jinaKamili.length > 150) return { error: "Majina ni marefu mno." };
  if (strict && jinaKamili.split(" ").length < 3) return { error: "Andika majina yako matatu kamili." };
  if (strict && !email) return { error: "Weka email yako." };
  if (email && (email.length > 150 || !EMAIL_PATTERN.test(email))) return { error: "Email si sahihi." };
  if (simu.length > 20) return { error: "Namba ya simu ni ndefu mno." };
  if (strict && !mkoa) return { error: "Chagua mkoa uliopo." };
  if (mkoa && !isTanzaniaRegion(mkoa)) return { error: "Chagua mkoa kutoka kwenye orodha." };
  const taken = await prisma.user.findFirst({
    where: { jina: { equals: jina, mode: "insensitive" }, id: { not: salesUserId } },
    select: { id: true },
  });
  if (taken) return { error: "Jina hilo la kuingia tayari linatumika." };

  return { data: { jina, jinaKamili: jinaKamili || null, email: email || null, simu: simu || null, mkoa: mkoa || null } };
}

/** Issues a fresh starter password, for a sales person who forgot theirs. */
export async function resetSalesPasswordAction(salesUserId: number): Promise<SalesCredentialsResult> {
  await requireAdmin();
  const sales = await prisma.user.findFirst({ where: { id: salesUserId, role: "SALES" } });
  if (!sales) return fail("Sales person hapatikani.");
  const password = randomChars(8);
  await prisma.user.update({
    where: { id: sales.id },
    data: { nenosiri: await hash(password, 10), tempPassword: password },
  });
  revalidatePath("/admin");
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
  revalidatePath("/admin");
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
    await prisma.user.update({ where: { id: sales.id }, data: { nenosiri: await hash(jipya, 10), tempPassword: null } });
  } catch {
    return fail("Imeshindikana kubadilisha nenosiri. Jaribu tena.");
  }
  revalidatePath("/sales");
  revalidatePath("/admin");
  return { success: true, message: "Nenosiri limebadilishwa." };
}

/** The sales person's own profile: real names, email and region are required before they can work. */
export async function updateSalesProfileAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const sales = await requireSales();
  const parsed = await parseSalesProfile(formData, sales.id, true);
  if ("error" in parsed) return fail(parsed.error);
  try {
    await prisma.user.update({ where: { id: sales.id }, data: parsed.data });
  } catch {
    return fail("Imeshindikana kuhifadhi taarifa. Jaribu tena.");
  }
  revalidatePath("/sales");
  revalidatePath("/admin");
  return { success: true, message: "Taarifa zako zimehifadhiwa." };
}
