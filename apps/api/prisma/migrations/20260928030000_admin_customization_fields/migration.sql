-- AlterTable: campos de personalización desde admin
ALTER TABLE "store_configs"
  ADD COLUMN "termsPageId" UUID,
  ADD COLUMN "termsVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "minOrderAmount" INTEGER,
  ADD COLUMN "productionEstimateDays" INTEGER,
  ADD COLUMN "deliveryEstimateDays" INTEGER,
  ADD COLUMN "emailSenderName" TEXT,
  ADD COLUMN "emailSenderAddress" TEXT,
  ADD COLUMN "googleOAuthEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "googleClientId" TEXT,
  ADD COLUMN "appleOAuthEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "appleClientId" TEXT;

-- CreateTable: redirects configurables
CREATE TABLE "store_redirects" (
    "id" UUID NOT NULL,
    "fromPath" TEXT NOT NULL,
    "toUrl" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL DEFAULT 301,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_redirects_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "store_redirects_fromPath_key" ON "store_redirects"("fromPath");

-- AlterTable: ids de OAuth en users
ALTER TABLE "users"
  ADD COLUMN "googleId" TEXT,
  ADD COLUMN "appleId" TEXT;

CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");
CREATE UNIQUE INDEX "users_appleId_key" ON "users"("appleId");
