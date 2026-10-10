-- Sales people fill in their real details on first login, and the starter
-- password the admin issued stays readable until they replace it.
ALTER TABLE "watumiaji"
  ADD COLUMN "jinaKamili" VARCHAR(150),
  ADD COLUMN "email" VARCHAR(150),
  ADD COLUMN "mkoa" VARCHAR(60),
  ADD COLUMN "tempPassword" VARCHAR(40);
