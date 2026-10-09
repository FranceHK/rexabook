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

function newReferralCode(): string {
  let code = "RX";
  for (let i = 0; i < 5; i += 1) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

export async function createSalesPersonAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();
  const username = String(formData.get("jina") ?? "").trim();
  const phone = String(formData.get("simu") ?? "").trim();
  const password = String(formData.get("nenosiri") ?? "");
  if (!username || username.length > 100) return fail("Weka jina la kuingia la sales person.");
  if (phone.length > 20) return fail("Namba ya simu ni ndefu mno.");
  if (password.length < 6) return fail("Nenosiri liwe na herufi 6 au zaidi.");
  if (await prisma.user.findFirst({ where: { jina: { equals: username, mode: "insensitive" } } })) return fail("Jina hilo tayari linatumika.");

  const nenosiri = await hash(password, 10);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const referralCode = newReferralCode();
    try {
      await prisma.user.create({
        data: { jina: username, nenosiri, jina_duka: "RexaBook Sales", simu: phone || null, role: "SALES", referralCode },
      });
      revalidatePath("/admin/sales");
      return { success: true, message: `${username} ameongezwa. Referral code yake ni ${referralCode}.` };
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
    await prisma.user.update({ where: { id: sales.id }, data: { nenosiri: await hash(jipya, 10) } });
  } catch {
    return fail("Imeshindikana kubadilisha nenosiri. Jaribu tena.");
  }
  return { success: true, message: "Nenosiri limebadilishwa." };
}
