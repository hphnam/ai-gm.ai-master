-- Self-owned 5-digit phone OTP store for the better-auth phoneNumber plugin.
CREATE TABLE "phone_otps" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attemptsLeft" INTEGER NOT NULL DEFAULT 5,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "phone_otps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "phone_otps_phoneNumber_idx" ON "phone_otps"("phoneNumber");
CREATE INDEX "phone_otps_expiresAt_idx" ON "phone_otps"("expiresAt");
