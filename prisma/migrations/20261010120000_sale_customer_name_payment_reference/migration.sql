-- Every sale now names its customer (registered or typed in), and a mobile
-- money sale carries its transaction id, which may be used only once per shop.
-- "kumbukumbuMalipo" already exists on some databases, hence IF NOT EXISTS.
ALTER TABLE "mauzo" ADD COLUMN IF NOT EXISTS "kumbukumbuMalipo" VARCHAR(120);
ALTER TABLE "mauzo" ADD COLUMN "jinaMteja" VARCHAR(100);

CREATE UNIQUE INDEX "mauzo_mtumiajiId_kumbukumbuMalipo_key" ON "mauzo"("mtumiajiId", "kumbukumbuMalipo");
