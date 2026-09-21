import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { SnippePaymentStatus } from "@/lib/snippe";

export class SmsPurchasePaymentError extends Error {}

export async function completeSmsPurchase(input: {
  reference: string;
  amount: number;
  currency: string;
  response?: string;
}): Promise<{ credited: boolean; units: number }> {
  return prisma.$transaction(async (tx) => {
    const purchase = await tx.smsPurchase.findUnique({ where: { paymentReference: input.reference } });
    if (!purchase) throw new SmsPurchasePaymentError("PURCHASE_NOT_FOUND");
    if (input.currency !== "TZS" || input.amount !== purchase.jumla) {
      throw new SmsPurchasePaymentError("PAYMENT_AMOUNT_MISMATCH");
    }
    if (purchase.status === "PAID") return { credited: false, units: purchase.idadiSms };

    const changed = await tx.smsPurchase.updateMany({
      where: { id: purchase.id, status: { not: "PAID" }, paymentReference: input.reference },
      data: {
        status: "PAID",
        paymentStatus: "completed",
        tareheKulipwa: new Date(),
        paymentResponse: input.response?.slice(0, 4000),
        maelezo: "Malipo yamethibitishwa moja kwa moja na Snippe",
      },
    });
    if (changed.count !== 1) return { credited: false, units: purchase.idadiSms };

    const account = await tx.user.update({
      where: { id: purchase.mtumiajiId },
      data: { smsBalance: { increment: purchase.idadiSms } },
      select: { smsBalance: true },
    });
    await tx.smsTransaction.create({
      data: {
        mtumiajiId: purchase.mtumiajiId,
        aina: "PURCHASE",
        vipande: purchase.idadiSms,
        salioBaada: account.smsBalance,
        purchaseId: purchase.id,
        maelezo: `Ununuzi wa SMS ${purchase.idadiSms} kupitia Snippe`,
      },
    });
    return { credited: true, units: purchase.idadiSms };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function updateSmsPurchasePaymentStatus(input: {
  reference: string;
  status: Exclude<SnippePaymentStatus, "completed" | "pending">;
  response?: string;
}): Promise<void> {
  const purchaseStatus = input.status === "voided" ? "CANCELLED" : "FAILED";
  await prisma.smsPurchase.updateMany({
    where: { paymentReference: input.reference, status: "PENDING" },
    data: {
      status: purchaseStatus,
      paymentStatus: input.status,
      paymentResponse: input.response?.slice(0, 4000),
      maelezo: input.status === "expired" ? "Muda wa malipo uliisha" : "Malipo hayakukamilika",
    },
  });
}
