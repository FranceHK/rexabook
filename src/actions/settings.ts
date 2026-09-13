"use server";

import { revalidatePath } from "next/cache";
import { hash, compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { profileSchema, passwordSchema } from "@/lib/validation";
import { parseZod, fail, type ActionResult } from "@/lib/action-result";

/** Replicates the profile portion of profaili_update.php. */
export async function updateProfileAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = parseZod(profileSchema, {
    jina: formData.get("jina"),
    jina_duka: formData.get("jina_duka"),
    simu: formData.get("simu"),
  });
  if (!parsed.success) return { success: false, message: parsed.message, fieldErrors: parsed.fieldErrors };

  const { jina, jina_duka, simu } = parsed.data!;

  const exists = await prisma.user.findFirst({
    where: { jina: { equals: jina, mode: "insensitive" }, id: { not: user.id } },
  });
  if (exists) return fail(`Jina la mtumiaji "${jina}" tayari linatumiwa.`);

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { jina, jina_duka, simu: simu || null },
    });
  } catch {
    return fail("Imeshindikana kusasisha taarifa. Jaribu tena.");
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: true, message: "Taarifa za akaunti zimesasishwa." };
}

/** Replicates the password-change portion of profaili_update.php. */
export async function changePasswordAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = parseZod(passwordSchema, {
    la_zamani: formData.get("la_zamani"),
    jipya: formData.get("jipya"),
    thibitisha: formData.get("thibitisha"),
  });
  if (!parsed.success) return { success: false, message: parsed.message, fieldErrors: parsed.fieldErrors };

  const { la_zamani, jipya } = parsed.data!;

  let sahihi = false;
  try {
    sahihi = await compare(la_zamani, user.nenosiri);
  } catch {
    sahihi = user.nenosiri === la_zamani;
  }
  if (!sahihi) return fail("Nenosiri lako la zamani si sahihi.");

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { nenosiri: await hash(jipya, 10) },
    });
  } catch {
    return fail("Imeshindikana kubadilisha nenosiri. Jaribu tena.");
  }

  return { success: true, message: "Nenosiri limebadilishwa." };
}