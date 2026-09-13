"use server";

import { redirect } from "next/navigation";
import { hash, compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { loginSchema, registerSchema } from "@/lib/validation";
import { createSession, destroySession } from "@/lib/auth";
import { formDataToObject, parseZod, fail, type ActionResult } from "@/lib/action-result";

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const parsed = parseZod(loginSchema, formDataToObject(formData));
  if (!parsed.success) return { success: false, message: parsed.message, fieldErrors: parsed.fieldErrors };

  const { jina, nenosiri } = parsed.data!;

  let user;
  try {
    user = await prisma.user.findFirst({
      where: { jina: { equals: jina, mode: "insensitive" } },
    });
  } catch {
    return fail("Kuna tatizo la mtandao/taarifa. Jaribu tena.");
  }

  if (!user) {
    return fail("Jina la mtumiaji au nenosiri si sahihi.");
  }

  let sahihi = false;
  try {
    sahihi = await compare(nenosiri, user.nenosiri);
  } catch {
    // allows legacy plaintext passwords migrated from the old system
    sahihi = user.nenosiri === nenosiri;
  }

  if (!sahihi) {
    return fail("Jina la mtumiaji au nenosiri si sahihi.");
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function registerAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const parsed = parseZod(registerSchema, formDataToObject(formData));
  if (!parsed.success) return { success: false, message: parsed.message, fieldErrors: parsed.fieldErrors };

  const { jina, jinaDuka, nenosiri } = parsed.data!;

  const exists = await prisma.user.findFirst({
    where: { jina: { equals: jina, mode: "insensitive" } },
  });
  if (exists) {
    return fail(`Jina la mtumiaji "${jina}" tayari linatumiwa.`);
  }

  const nenosiriHashed = await hash(nenosiri, 10);

  let user;
  try {
    user = await prisma.user.create({
      data: { jina, jina_duka: jinaDuka, nenosiri: nenosiriHashed },
    });
  } catch {
    return fail("Imeshindikana kuunda akaunti. Jaribu tena.");
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}