-- Snippe mobile-money payment tracking for automatic SMS wallet top-ups.
ALTER TABLE "sms_manunuzi"
  ADD COLUMN "paymentProvider" VARCHAR(30),
  ADD COLUMN "paymentReference" VARCHAR(120),
  ADD COLUMN "paymentPhone" VARCHAR(20),
  ADD COLUMN "paymentStatus" VARCHAR(30),
  ADD COLUMN "paymentResponse" TEXT,
  ADD COLUMN "paymentExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "sms_manunuzi_paymentReference_key"
  ON "sms_manunuzi"("paymentReference");
