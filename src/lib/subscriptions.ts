import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { SnippePaymentStatus } from "@/lib/snippe";

export class SubscriptionPaymentError extends Error {}

export async function completeSubscriptionPayment(input: {
  reference: string;
  amount: number;
  currency: string;
  response?: string;
}): Promise<{ activated: boolean; endsAt: Date }> {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.subscriptionPayment.findUnique({ where: { paymentReference: input.reference } });
    if (!payment) throw new SubscriptionPaymentError("SUBSCRIPTION_NOT_FOUND");
    if (input.currency !== "TZS" || input.amount !== payment.kiasi) {
      throw new SubscriptionPaymentError("SUBSCRIPTION_AMOUNT_MISMATCH");
    }
    const owner = await tx.user.findUnique({ where: { id: payment.mtumiajiId } });
    if (!owner) throw new SubscriptionPaymentError("OWNER_NOT_FOUND");
    if (payment.status === "ACTIVE") {
      return { activated: false, endsAt: owner.subscriptionEndsAt ?? new Date() };
    }

    const changed = await tx.subscriptionPayment.updateMany({
      where: { id: payment.id, status: { not: "ACTIVE" } },
      data: {
        status: "ACTIVE",
        paymentStatus: "completed",
        tareheKulipwa: new Date(),
        paymentResponse: input.response?.slice(0, 4000),
      },
    });
    if (changed.count !== 1) return { activated: false, endsAt: owner.subscriptionEndsAt ?? new Date() };

    const base = owner.subscriptionEndsAt && owner.subscriptionEndsAt > new Date()
      ? owner.subscriptionEndsAt
      : new Date();
    const endsAt = new Date(base);
    endsAt.setMonth(endsAt.getMonth() + payment.miezi);
    await tx.user.update({
      where: { id: owner.id },
      data: { subscriptionStatus: "ACTIVE", subscriptionEndsAt: endsAt },
    });
    await tx.auditLog.create({
      data: {
        mtumiajiId: owner.id,
        actorUserId: owner.id,
        action: "SUBSCRIPTION_ACTIVATED",
        entity: "SubscriptionPayment",
        entityId: String(payment.id),
        details: JSON.stringify({ months: payment.miezi, amount: payment.kiasi, endsAt }),
      },
    });
    return { activated: true, endsAt };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function updateSubscriptionPaymentStatus(input: {
  reference: string;
  status: Exclude<SnippePaymentStatus, "completed" | "pending">;
  response?: string;
}): Promise<void> {
  await prisma.subscriptionPayment.updateMany({
    where: { paymentReference: input.reference, status: "PENDING" },
    data: {
      status: input.status === "voided" ? "CANCELLED" : "FAILED",
      paymentStatus: input.status,
      paymentResponse: input.response?.slice(0, 4000),
    },
  });
}
