"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { customerCreateSchema, customerUpdateSchema } from "@/lib/validation";
import { formDataToObject, parseZod, fail, type ActionResult } from "@/lib/action-result";

/** Replicates wateja_add.php – adds a new customer for the signed-in user. */
export async function createCustomerAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = parseZod(customerCreateSchema, formDataToObject(formData));
  if (!parsed.success) return { success: false, message: parsed.message, fieldErrors: parsed.fieldErrors };

  const { jina, simu, location } = parsed.data!;

  try {
    await prisma.customer.create({
      data: {
        mtumiajiId: user.id,
        jina,
        simu: simu || null,
        location: location || null,
      },
    });
  } catch {
    return fail("Imeshindikana kumhifadhi mteja. Jaribu tena.");
  }

  revalidatePath("/customers");
  revalidatePath("/dashboard");
  return { success: true, message: `Mteja "${jina}" ameongezwa.` };
}

/** Replicates mteja_update.php – edits customer details (ownership enforced). */
export async function updateCustomerAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = parseZod(customerUpdateSchema, formDataToObject(formData));
  if (!parsed.success) return { success: false, message: parsed.message, fieldErrors: parsed.fieldErrors };

  const { mteja_id, jina, simu, location } = parsed.data!;

  const owned = await prisma.customer.count({
    where: { id: mteja_id, mtumiajiId: user.id },
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

  revalidatePath("/customers");
  revalidatePath(`/customers/${mteja_id}`);
  return { success: true, message: "Taarifa za mteja zimesasishwa." };
}