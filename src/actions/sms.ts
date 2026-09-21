"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { fail, type ActionResult } from "@/lib/action-result";
import { smsPurchaseTotals, SMS_SELLING_PRICE } from "@/lib/sms-pricing";
import { normalizePhone } from "@/lib/sms";
import { createSnippePayment, getSnippePayment } from "@/lib/snippe";
import { completeSmsPurchase, updateSmsPurchasePaymentStatus } from "@/lib/sms-purchases";

const MIN_SNIPPE_SMS = 25;

function refreshSmsPages() {
  revalidatePath("/settings");
  revalidatePath("/admin/sms");
}

export async function updateSmsPreferenceAction(enabled: boolean): Promise<ActionResult> {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { smsEnabled: enabled },
  });
  refreshSmsPages();
  return {
    success: true,
    message: enabled ? "SMS zimewashwa kwenye akaunti yako." : "SMS zimezimwa kwenye akaunti yako.",
  };
}

export async function requestSmsPurchaseAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  if (!process.env.SNIPPE_API_KEY) {
    return fail("Malipo ya Snippe bado hayajaunganishwa. Wasiliana na admin.");
  }
  const units = Number(formData.get("idadi_sms"));
  const phone = normalizePhone(String(formData.get("namba_malipo") ?? "").trim());

  if (!Number.isSafeInteger(units) || units < MIN_SNIPPE_SMS || units > 100_000) {
    return fail(`Weka idadi ya SMS kati ya ${MIN_SNIPPE_SMS} na 100,000.`);
  }
  if (!/^255\d{9}$/.test(phone)) return fail("Weka namba sahihi ya Tanzania, mfano 0712345678.");

  const pendingCount = await prisma.smsPurchase.count({
    where: { mtumiajiId: user.id, status: "PENDING" },
  });
  if (pendingCount >= 3) {
    return fail("Una malipo matatu yanayosubiri. Yakamilishe au yasubiri kuisha kabla ya kuanza mengine.");
  }

  const totals = smsPurchaseTotals(units);
  const purchase = await prisma.smsPurchase.create({
    data: {
      mtumiajiId: user.id,
      idadiSms: units,
      beiKwaSms: SMS_SELLING_PRICE,
      jumla: totals.total,
      gharamaMtoa: totals.providerCost,
      faida: totals.profit,
      paymentProvider: "SNIPPE",
      paymentPhone: phone,
      paymentStatus: "creating",
    },
  });

  const nameParts = user.jina.trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] && !nameParts[0].includes("@") ? nameParts[0] : "Mteja";
  const lastName = nameParts.slice(1).join(" ") || user.jina_duka.trim() || "RexaBook";
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.jina)
    ? user.jina
    : `malipo+${user.id}@rexabook.app`;

  try {
    const payment = await createSnippePayment({
      purchaseId: purchase.id,
      userId: user.id,
      units,
      amount: totals.total,
      phone,
      firstName,
      lastName,
      email,
    });
    await prisma.smsPurchase.update({
      where: { id: purchase.id },
      data: {
        kumbukumbu: payment.reference,
        paymentReference: payment.reference,
        paymentStatus: payment.status,
        paymentExpiresAt: payment.expires_at ? new Date(payment.expires_at) : null,
        paymentResponse: JSON.stringify(payment).slice(0, 4000),
      },
    });

    if (payment.status === "completed") {
      await completeSmsPurchase({
        reference: payment.reference,
        amount: payment.amount.value,
        currency: payment.amount.currency,
        response: JSON.stringify(payment),
      });
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "SNIPPE_PAYMENT_FAILED";
    await prisma.smsPurchase.update({
      where: { id: purchase.id },
      data: { status: "FAILED", paymentStatus: "failed_to_create", paymentResponse: reason.slice(0, 4000) },
    });
    refreshSmsPages();
    return fail("Snippe haikuweza kuanzisha malipo. Hakikisha namba ni sahihi kisha jaribu tena.");
  }

  refreshSmsPages();
  return {
    success: true,
    message: `Ombi la TZS ${totals.total.toLocaleString("en-TZ")} limetumwa ${phone}. Thibitisha kwa PIN kwenye simu yako.`,
  };
}

export async function checkSmsPurchaseStatusAction(purchaseId: number): Promise<ActionResult> {
  const user = await requireUser();
  if (!Number.isSafeInteger(purchaseId) || purchaseId <= 0) return fail("Ununuzi si sahihi.");

  const purchase = await prisma.smsPurchase.findUnique({ where: { id: purchaseId } });
  if (!purchase || (purchase.mtumiajiId !== user.id && user.role !== "ADMIN")) {
    return fail("Ununuzi huu haupatikani.");
  }
  if (!purchase.paymentReference || purchase.paymentProvider !== "SNIPPE") {
    return fail("Ununuzi huu wa zamani hauna kumbukumbu ya Snippe.");
  }

  try {
    const payment = await getSnippePayment(purchase.paymentReference);
    const response = JSON.stringify(payment);
    if (payment.status === "completed") {
      const result = await completeSmsPurchase({
        reference: payment.reference,
        amount: payment.amount.value,
        currency: payment.amount.currency,
        response,
      });
      refreshSmsPages();
      return {
        success: true,
        message: result.credited
          ? `Malipo yamekamilika; SMS ${result.units.toLocaleString("en-TZ")} zimeongezwa.`
          : "Malipo haya tayari yalithibitishwa.",
      };
    }

    if (payment.status === "failed" || payment.status === "voided" || payment.status === "expired") {
      await updateSmsPurchasePaymentStatus({
        reference: payment.reference,
        status: payment.status,
        response,
      });
      refreshSmsPages();
      return fail(payment.status === "expired" ? "Muda wa malipo umeisha. Anzisha ununuzi mpya." : "Malipo hayakukamilika.");
    }

    await prisma.smsPurchase.update({
      where: { id: purchase.id },
      data: { paymentStatus: payment.status, paymentResponse: response.slice(0, 4000) },
    });
    return fail("Malipo bado yanasubiri uthibitisho kwenye simu.");
  } catch {
    return fail("Hali ya malipo haijapatikana kwa sasa. Jaribu tena baada ya muda mfupi.");
  }
}

export async function approveSmsPurchaseAction(purchaseId: number): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!Number.isSafeInteger(purchaseId) || purchaseId <= 0) return fail("Ombi si sahihi.");

  try {
    const purchase = await prisma.$transaction(async (tx) => {
      const found = await tx.smsPurchase.findUnique({ where: { id: purchaseId } });
      if (!found || found.status !== "PENDING") throw new Error("PURCHASE_NOT_PENDING");
      if (found.paymentProvider === "SNIPPE") throw new Error("SNIPPE_REQUIRES_PAYMENT");

      const changed = await tx.smsPurchase.updateMany({
        where: { id: purchaseId, status: "PENDING" },
        data: { status: "PAID", tareheKulipwa: new Date(), approvedById: admin.id },
      });
      if (changed.count !== 1) throw new Error("PURCHASE_NOT_PENDING");

      const account = await tx.user.update({
        where: { id: found.mtumiajiId },
        data: { smsBalance: { increment: found.idadiSms } },
        select: { smsBalance: true },
      });
      await tx.smsTransaction.create({
        data: {
          mtumiajiId: found.mtumiajiId,
          aina: "PURCHASE",
          vipande: found.idadiSms,
          salioBaada: account.smsBalance,
          purchaseId: found.id,
          maelezo: `Ununuzi wa SMS ${found.idadiSms} umethibitishwa`,
        },
      });
      return found;
    });

    refreshSmsPages();
    return { success: true, message: `Malipo yamethibitishwa; SMS ${purchase.idadiSms} zimeongezwa.` };
  } catch (error) {
    if (error instanceof Error && error.message === "PURCHASE_NOT_PENDING") {
      return fail("Ombi hili halipo au tayari limeshughulikiwa.");
    }
    if (error instanceof Error && error.message === "SNIPPE_REQUIRES_PAYMENT") {
      return fail("Malipo ya Snippe lazima yathibitishwe na Snippe, si kwa mkono.");
    }
    return fail("Imeshindikana kuthibitisha ununuzi. Jaribu tena.");
  }
}

export async function rejectSmsPurchaseAction(purchaseId: number): Promise<ActionResult> {
  await requireAdmin();
  if (!Number.isSafeInteger(purchaseId) || purchaseId <= 0) return fail("Ombi si sahihi.");

  const changed = await prisma.smsPurchase.updateMany({
    where: { id: purchaseId, status: "PENDING" },
    data: { status: "REJECTED" },
  });
  if (changed.count !== 1) return fail("Ombi hili halipo au tayari limeshughulikiwa.");

  refreshSmsPages();
  return { success: true, message: "Ombi la ununuzi limekataliwa." };
}

export async function cancelSmsPurchaseAction(purchaseId: number): Promise<ActionResult> {
  const user = await requireUser();
  if (!Number.isSafeInteger(purchaseId) || purchaseId <= 0) return fail("Ombi si sahihi.");

  const changed = await prisma.smsPurchase.updateMany({
    where: { id: purchaseId, mtumiajiId: user.id, status: "PENDING" },
    data: { status: "CANCELLED", paymentStatus: "cancelled_locally", maelezo: "Limeghairiwa na mtumiaji" },
  });
  if (changed.count !== 1) {
    return fail("Ombi halipo, si lako, au tayari limeshughulikiwa.");
  }

  refreshSmsPages();
  return { success: true, message: "Ombi la ununuzi wa SMS limeghairiwa." };
}

export async function adjustSmsBalanceAction(
  userId: number,
  units: number,
  note?: string
): Promise<ActionResult> {
  await requireAdmin();
  if (!Number.isSafeInteger(userId) || userId <= 0) return fail("Mtumiaji si sahihi.");
  if (!Number.isSafeInteger(units) || units === 0 || Math.abs(units) > 100_000) {
    return fail("Marekebisho yawe kati ya -100,000 na 100,000, bila sifuri.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { smsBalance: true } });
      if (!user) throw new Error("USER_NOT_FOUND");
      const nextBalance = user.smsBalance + units;
      if (nextBalance < 0) throw new Error("NEGATIVE_BALANCE");

      await tx.user.update({ where: { id: userId }, data: { smsBalance: nextBalance } });
      await tx.smsTransaction.create({
        data: {
          mtumiajiId: userId,
          aina: "ADJUSTMENT",
          vipande: units,
          salioBaada: nextBalance,
          maelezo: (note?.trim() || "Marekebisho ya admin").slice(0, 255),
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NEGATIVE_BALANCE") return fail("Salio haliwezi kuwa chini ya sifuri.");
    if (error instanceof Error && error.message === "USER_NOT_FOUND") return fail("Mtumiaji hapatikani.");
    return fail("Imeshindikana kurekebisha salio.");
  }

  refreshSmsPages();
  return { success: true, message: "Salio la SMS limerekebishwa." };
}
