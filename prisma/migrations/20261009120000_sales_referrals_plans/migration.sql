-- Sales people (referral codes + 20% commission on every subscription
-- payment made by a business they referred) and the two monthly plans.
ALTER TYPE "UserRole" ADD VALUE 'SALES';
CREATE TYPE "SubscriptionPlan" AS ENUM ('BASIC', 'FULL');

ALTER TABLE "watumiaji"
  ADD COLUMN "referralCode" VARCHAR(20),
  ADD COLUMN "referredById" INTEGER,
  ADD COLUMN "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'FULL';

ALTER TABLE "subscription_malipo"
  ADD COLUMN "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FULL';

CREATE TABLE "sales_commission" (
  "id" SERIAL PRIMARY KEY,
  "salesUserId" INTEGER NOT NULL,
  "customerUserId" INTEGER NOT NULL,
  "subscriptionPaymentId" INTEGER NOT NULL,
  "kiasiMalipo" INTEGER NOT NULL,
  "asilimia" INTEGER NOT NULL,
  "kiasi" INTEGER NOT NULL,
  "tarehe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tareheKulipwa" TIMESTAMP(3)
);

CREATE UNIQUE INDEX "watumiaji_referralCode_key" ON "watumiaji"("referralCode");
CREATE INDEX "watumiaji_referredById_idx" ON "watumiaji"("referredById");
CREATE UNIQUE INDEX "sales_commission_subscriptionPaymentId_key" ON "sales_commission"("subscriptionPaymentId");
CREATE INDEX "sales_commission_salesUserId_idx" ON "sales_commission"("salesUserId");
CREATE INDEX "sales_commission_customerUserId_idx" ON "sales_commission"("customerUserId");

ALTER TABLE "watumiaji" ADD CONSTRAINT "watumiaji_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "watumiaji"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_commission" ADD CONSTRAINT "sales_commission_salesUserId_fkey" FOREIGN KEY ("salesUserId") REFERENCES "watumiaji"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sales_commission" ADD CONSTRAINT "sales_commission_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "watumiaji"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sales_commission" ADD CONSTRAINT "sales_commission_subscriptionPaymentId_fkey" FOREIGN KEY ("subscriptionPaymentId") REFERENCES "subscription_malipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
