-- Business operations: subscriptions, staff roles, inventory, sales,
-- expenses, cargo-to-stock costing, and audit history.
CREATE TYPE "BusinessRole" AS ENUM ('OWNER', 'MANAGER', 'CASHIER');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'FAILED');
CREATE TYPE "SalePaymentMethod" AS ENUM ('CASH', 'MOBILE_MONEY', 'BANK', 'CREDIT');
CREATE TYPE "StockMovementType" AS ENUM ('OPENING', 'PURCHASE', 'SALE', 'CARGO', 'ADJUSTMENT');

ALTER TABLE "watumiaji"
  ADD COLUMN "ownerId" INTEGER,
  ADD COLUMN "businessRole" "BusinessRole" NOT NULL DEFAULT 'OWNER',
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
  ADD COLUMN "subscriptionEndsAt" TIMESTAMP(3);

UPDATE "watumiaji"
SET "subscriptionEndsAt" = CURRENT_TIMESTAMP + INTERVAL '14 days'
WHERE "subscriptionEndsAt" IS NULL;

ALTER TABLE "mizigo_bidhaa"
  ADD COLUMN "productId" INTEGER,
  ADD COLUMN "landedCost" DECIMAL(12,2),
  ADD COLUMN "stockedAt" TIMESTAMP(3);

CREATE TABLE "bidhaa" (
  "id" SERIAL PRIMARY KEY,
  "mtumiajiId" INTEGER NOT NULL,
  "jina" VARCHAR(150) NOT NULL,
  "sku" VARCHAR(60) NOT NULL,
  "kitengo" VARCHAR(30) NOT NULL DEFAULT 'pc',
  "beiKununua" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "beiKuuza" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "stockTahadhari" INTEGER NOT NULL DEFAULT 5,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "tareheKuundwa" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tareheKubadilishwa" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "stock_miamala" (
  "id" SERIAL PRIMARY KEY,
  "mtumiajiId" INTEGER NOT NULL,
  "productId" INTEGER NOT NULL,
  "aina" "StockMovementType" NOT NULL,
  "idadi" INTEGER NOT NULL,
  "stockBaada" INTEGER NOT NULL,
  "kumbukumbu" VARCHAR(100),
  "maelezo" VARCHAR(255),
  "tarehe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "mauzo" (
  "id" SERIAL PRIMARY KEY,
  "mtumiajiId" INTEGER NOT NULL,
  "customerId" INTEGER,
  "servedById" INTEGER,
  "receiptNumber" VARCHAR(40) NOT NULL,
  "njiaMalipo" "SalePaymentMethod" NOT NULL,
  "jumla" DECIMAL(12,2) NOT NULL,
  "gharama" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "faida" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "kiasiKilicholipwa" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "maelezo" TEXT,
  "tarehe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "mauzo_bidhaa" (
  "id" SERIAL PRIMARY KEY,
  "saleId" INTEGER NOT NULL,
  "productId" INTEGER,
  "jinaBidhaa" VARCHAR(150) NOT NULL,
  "idadi" INTEGER NOT NULL,
  "beiKununua" DECIMAL(12,2) NOT NULL,
  "beiKuuza" DECIMAL(12,2) NOT NULL,
  "jumla" DECIMAL(12,2) NOT NULL
);

CREATE TABLE "matumizi" (
  "id" SERIAL PRIMARY KEY,
  "mtumiajiId" INTEGER NOT NULL,
  "aina" VARCHAR(60) NOT NULL,
  "kiasi" DECIMAL(12,2) NOT NULL,
  "maelezo" TEXT,
  "tarehe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "subscription_malipo" (
  "id" SERIAL PRIMARY KEY,
  "mtumiajiId" INTEGER NOT NULL,
  "kiasi" INTEGER NOT NULL DEFAULT 15000,
  "miezi" INTEGER NOT NULL DEFAULT 1,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
  "paymentProvider" VARCHAR(30) NOT NULL DEFAULT 'SNIPPE',
  "paymentReference" VARCHAR(120),
  "paymentPhone" VARCHAR(20),
  "paymentStatus" VARCHAR(30),
  "paymentResponse" TEXT,
  "paymentExpiresAt" TIMESTAMP(3),
  "tareheKuundwa" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tareheKulipwa" TIMESTAMP(3)
);

CREATE TABLE "audit_logs" (
  "id" SERIAL PRIMARY KEY,
  "mtumiajiId" INTEGER NOT NULL,
  "actorUserId" INTEGER,
  "action" VARCHAR(80) NOT NULL,
  "entity" VARCHAR(80) NOT NULL,
  "entityId" VARCHAR(80),
  "details" TEXT,
  "tarehe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "watumiaji_ownerId_idx" ON "watumiaji"("ownerId");
CREATE UNIQUE INDEX "bidhaa_mtumiajiId_sku_key" ON "bidhaa"("mtumiajiId", "sku");
CREATE INDEX "bidhaa_mtumiajiId_idx" ON "bidhaa"("mtumiajiId");
CREATE INDEX "bidhaa_jina_idx" ON "bidhaa"("jina");
CREATE INDEX "stock_miamala_mtumiajiId_idx" ON "stock_miamala"("mtumiajiId");
CREATE INDEX "stock_miamala_productId_idx" ON "stock_miamala"("productId");
CREATE INDEX "stock_miamala_tarehe_idx" ON "stock_miamala"("tarehe");
CREATE UNIQUE INDEX "mauzo_receiptNumber_key" ON "mauzo"("receiptNumber");
CREATE INDEX "mauzo_mtumiajiId_idx" ON "mauzo"("mtumiajiId");
CREATE INDEX "mauzo_customerId_idx" ON "mauzo"("customerId");
CREATE INDEX "mauzo_tarehe_idx" ON "mauzo"("tarehe");
CREATE INDEX "mauzo_bidhaa_saleId_idx" ON "mauzo_bidhaa"("saleId");
CREATE INDEX "mauzo_bidhaa_productId_idx" ON "mauzo_bidhaa"("productId");
CREATE INDEX "matumizi_mtumiajiId_idx" ON "matumizi"("mtumiajiId");
CREATE INDEX "matumizi_tarehe_idx" ON "matumizi"("tarehe");
CREATE UNIQUE INDEX "subscription_malipo_paymentReference_key" ON "subscription_malipo"("paymentReference");
CREATE INDEX "subscription_malipo_mtumiajiId_idx" ON "subscription_malipo"("mtumiajiId");
CREATE INDEX "subscription_malipo_status_idx" ON "subscription_malipo"("status");
CREATE INDEX "audit_logs_mtumiajiId_idx" ON "audit_logs"("mtumiajiId");
CREATE INDEX "audit_logs_tarehe_idx" ON "audit_logs"("tarehe");
CREATE INDEX "mizigo_bidhaa_productId_idx" ON "mizigo_bidhaa"("productId");

ALTER TABLE "watumiaji" ADD CONSTRAINT "watumiaji_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "watumiaji"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bidhaa" ADD CONSTRAINT "bidhaa_mtumiajiId_fkey" FOREIGN KEY ("mtumiajiId") REFERENCES "watumiaji"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_miamala" ADD CONSTRAINT "stock_miamala_mtumiajiId_fkey" FOREIGN KEY ("mtumiajiId") REFERENCES "watumiaji"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_miamala" ADD CONSTRAINT "stock_miamala_productId_fkey" FOREIGN KEY ("productId") REFERENCES "bidhaa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mauzo" ADD CONSTRAINT "mauzo_mtumiajiId_fkey" FOREIGN KEY ("mtumiajiId") REFERENCES "watumiaji"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mauzo" ADD CONSTRAINT "mauzo_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "wateja"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "mauzo" ADD CONSTRAINT "mauzo_servedById_fkey" FOREIGN KEY ("servedById") REFERENCES "watumiaji"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "mauzo_bidhaa" ADD CONSTRAINT "mauzo_bidhaa_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "mauzo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mauzo_bidhaa" ADD CONSTRAINT "mauzo_bidhaa_productId_fkey" FOREIGN KEY ("productId") REFERENCES "bidhaa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "matumizi" ADD CONSTRAINT "matumizi_mtumiajiId_fkey" FOREIGN KEY ("mtumiajiId") REFERENCES "watumiaji"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscription_malipo" ADD CONSTRAINT "subscription_malipo_mtumiajiId_fkey" FOREIGN KEY ("mtumiajiId") REFERENCES "watumiaji"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_mtumiajiId_fkey" FOREIGN KEY ("mtumiajiId") REFERENCES "watumiaji"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "watumiaji"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "mizigo_bidhaa" ADD CONSTRAINT "mizigo_bidhaa_productId_fkey" FOREIGN KEY ("productId") REFERENCES "bidhaa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
