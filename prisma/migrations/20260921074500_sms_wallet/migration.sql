-- SMS credit wallet and reseller accounting. This migration is additive:
-- it does not drop or rename any existing table or column.

CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "SmsPurchaseStatus" AS ENUM ('PENDING', 'PAID', 'REJECTED', 'FAILED');
CREATE TYPE "SmsTransactionType" AS ENUM ('PURCHASE', 'USAGE', 'REFUND', 'ADJUSTMENT');

ALTER TABLE "watumiaji"
  ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER',
  ADD COLUMN "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "smsBalance" INTEGER NOT NULL DEFAULT 0;

-- Preserve a manageable system after rollout: the oldest existing account
-- becomes the initial admin. Future first-account registration is also admin.
UPDATE "watumiaji"
SET "role" = 'ADMIN'
WHERE "id" = (SELECT MIN("id") FROM "watumiaji");

ALTER TABLE "sms_log"
  ADD COLUMN "mtumiajiId" INTEGER,
  ADD COLUMN "vipande" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "beiMteja" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "gharamaMtoa" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "faida" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "sms_manunuzi" (
  "id" SERIAL NOT NULL,
  "mtumiajiId" INTEGER NOT NULL,
  "idadiSms" INTEGER NOT NULL,
  "beiKwaSms" INTEGER NOT NULL DEFAULT 20,
  "jumla" INTEGER NOT NULL,
  "gharamaMtoa" INTEGER NOT NULL,
  "faida" INTEGER NOT NULL,
  "status" "SmsPurchaseStatus" NOT NULL DEFAULT 'PENDING',
  "kumbukumbu" VARCHAR(120),
  "maelezo" TEXT,
  "tareheKuundwa" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tareheKulipwa" TIMESTAMP(3),
  "approvedById" INTEGER,
  CONSTRAINT "sms_manunuzi_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sms_miamala" (
  "id" SERIAL NOT NULL,
  "mtumiajiId" INTEGER NOT NULL,
  "aina" "SmsTransactionType" NOT NULL,
  "vipande" INTEGER NOT NULL,
  "salioBaada" INTEGER NOT NULL,
  "maelezo" VARCHAR(255),
  "purchaseId" INTEGER,
  "smsLogId" INTEGER,
  "tarehe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sms_miamala_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sms_log_mtumiajiId_idx" ON "sms_log"("mtumiajiId");
CREATE INDEX "sms_manunuzi_mtumiajiId_idx" ON "sms_manunuzi"("mtumiajiId");
CREATE INDEX "sms_manunuzi_status_idx" ON "sms_manunuzi"("status");
CREATE INDEX "sms_manunuzi_tareheKuundwa_idx" ON "sms_manunuzi"("tareheKuundwa");
CREATE INDEX "sms_miamala_mtumiajiId_idx" ON "sms_miamala"("mtumiajiId");
CREATE INDEX "sms_miamala_aina_idx" ON "sms_miamala"("aina");
CREATE INDEX "sms_miamala_tarehe_idx" ON "sms_miamala"("tarehe");

ALTER TABLE "sms_log"
  ADD CONSTRAINT "sms_log_mtumiajiId_fkey"
  FOREIGN KEY ("mtumiajiId") REFERENCES "watumiaji"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sms_manunuzi"
  ADD CONSTRAINT "sms_manunuzi_mtumiajiId_fkey"
  FOREIGN KEY ("mtumiajiId") REFERENCES "watumiaji"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sms_miamala"
  ADD CONSTRAINT "sms_miamala_mtumiajiId_fkey"
  FOREIGN KEY ("mtumiajiId") REFERENCES "watumiaji"("id") ON DELETE CASCADE ON UPDATE CASCADE;
