-- Sales people get a temporary password from the admin and must replace it on first login.
ALTER TABLE "watumiaji" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
