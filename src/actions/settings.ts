"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { hash, compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { DASHBOARD_CACHE_TAG } from "@/lib/cache-tags";
import { requireUser } from "@/lib/auth";
import { profileSchema, passwordSchema, companyCardSchema } from "@/lib/validation";
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
  revalidateTag(DASHBOARD_CACHE_TAG);
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

/** Adds a company payment card (company, bank, payment number). */
export async function addCompanyCardAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = parseZod(companyCardSchema, {
    jina_kampuni: formData.get("jina_kampuni"),
    bank: formData.get("bank"),
    namba_malipo: formData.get("namba_malipo"),
  });
  if (!parsed.success) return { success: false, message: parsed.message, fieldErrors: parsed.fieldErrors };

  const { jina_kampuni, bank, namba_malipo } = parsed.data!;

  try {
    await prisma.companyCard.create({
      data: {
        mtumiajiId: user.id,
        jinaKampuni: jina_kampuni,
        bank,
        nambaMalipo: namba_malipo,
      },
    });
  } catch {
    return fail("Imeshindikana kuhifadhi kadi ya kampuni. Jaribu tena.");
  }

  revalidatePath("/settings");
  return { success: true, message: `Kadi ya "${jina_kampuni}" imehifadhiwa.` };
}

/** Removes a company payment card. */
export async function deleteCompanyCardAction(cardId: number): Promise<ActionResult> {
  const user = await requireUser();

  const card = await prisma.companyCard.findFirst({
    where: { id: cardId, mtumiajiId: user.id },
  });
  if (!card) return fail("Kadi haipatikani.");

  await prisma.companyCard.delete({ where: { id: cardId } });

  revalidatePath("/settings");
  return { success: true, message: "Kadi imefutwa." };
}

/** Deletes a registered user account and all of its data (customers, debts, cargo, SMS). */
export async function deleteUserAction(userId: number): Promise<ActionResult> {
  const me = await requireUser();
  if (userId === me.id) return fail("Huwezi kufuta akaunti yako mwenyewe.");

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return fail("Mtumiaji hapatikani. Inawezekana ameshafutwa.");

  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch {
    return fail("Imeshindikana kufuta akaunti ya mtumiaji. Jaribu tena.");
  }

  revalidatePath("/settings");
  return { success: true, message: `Akaunti ya "${target.jina}" imefutwa pamoja na data yake yote.` };
}
