import type { SubscriptionPlan } from "@prisma/client";

export type PlanFeature = "staff" | "cargo" | "backup" | "audit";

export const SALES_COMMISSION_PERCENT = 20;

export const SUBSCRIPTION_PLANS: Record<
  SubscriptionPlan,
  { label: string; price: number; summary: string; features: PlanFeature[] }
> = {
  BASIC: {
    label: "Msingi",
    price: 100_000,
    summary: "Wadaiwa, bidhaa, mauzo, matumizi na risiti (mmiliki peke yake).",
    features: [],
  },
  FULL: {
    label: "Kamili",
    price: 200_000,
    summary: "Kila kitu cha Msingi pamoja na wafanyakazi, mizigo, backup na audit.",
    features: ["staff", "cargo", "backup", "audit"],
  },
};

export function isSubscriptionPlan(value: unknown): value is SubscriptionPlan {
  return value === "BASIC" || value === "FULL";
}

export function planHasFeature(plan: SubscriptionPlan, feature: PlanFeature): boolean {
  return SUBSCRIPTION_PLANS[plan].features.includes(feature);
}

export function commissionFor(amount: number): number {
  return Math.round((amount * SALES_COMMISSION_PERCENT) / 100);
}
