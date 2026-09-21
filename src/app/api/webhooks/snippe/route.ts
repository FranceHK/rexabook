import { NextResponse } from "next/server";
import { completeSmsPurchase, SmsPurchasePaymentError, updateSmsPurchasePaymentStatus } from "@/lib/sms-purchases";
import { verifySnippeWebhook } from "@/lib/snippe";
import { prisma } from "@/lib/db";
import {
  completeSubscriptionPayment,
  SubscriptionPaymentError,
  updateSubscriptionPaymentStatus,
} from "@/lib/subscriptions";

export const runtime = "nodejs";

interface SnippeWebhookEvent {
  id?: string;
  type?: string;
  data?: {
    reference?: string;
    status?: string;
    amount?: { value?: number; currency?: string };
  };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const timestamp = request.headers.get("x-webhook-timestamp");
  const signature = request.headers.get("x-webhook-signature");

  if (!verifySnippeWebhook(rawBody, timestamp, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let event: SnippeWebhookEvent;
  try {
    event = JSON.parse(rawBody) as SnippeWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reference = event.data?.reference;
  if (!reference || !event.type?.startsWith("payment.")) {
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    const [smsPurchase, subscriptionPayment] = await Promise.all([
      prisma.smsPurchase.findUnique({ where: { paymentReference: reference }, select: { id: true } }),
      prisma.subscriptionPayment.findUnique({ where: { paymentReference: reference }, select: { id: true } }),
    ]);
    if (!smsPurchase && !subscriptionPayment) {
      return NextResponse.json({ received: true, ignored: true });
    }

    if (event.type === "payment.completed") {
      const amount = event.data?.amount?.value;
      const currency = event.data?.amount?.currency;
      if (typeof amount !== "number" || !Number.isSafeInteger(amount) || !currency) {
        return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
      }
      if (subscriptionPayment) {
        await completeSubscriptionPayment({ reference, amount, currency, response: rawBody });
      } else {
        await completeSmsPurchase({ reference, amount, currency, response: rawBody });
      }
    } else if (event.type === "payment.failed" || event.type === "payment.voided" || event.type === "payment.expired") {
      const status = event.type.replace("payment.", "") as "failed" | "voided" | "expired";
      if (subscriptionPayment) {
        await updateSubscriptionPaymentStatus({ reference, status, response: rawBody });
      } else {
        await updateSmsPurchasePaymentStatus({ reference, status, response: rawBody });
      }
    }
  } catch (error) {
    if (error instanceof SmsPurchasePaymentError || error instanceof SubscriptionPaymentError) {
      const ignored = error.message === "PURCHASE_NOT_FOUND";
      return NextResponse.json(
        { received: true, ignored, error: ignored ? undefined : "Payment did not match the purchase" },
        { status: ignored ? 200 : 400 }
      );
    }
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
