-- better-auth phoneNumber plugin: verification flag on the user row.
ALTER TABLE "users" ADD COLUMN "phoneNumberVerified" BOOLEAN NOT NULL DEFAULT false;
