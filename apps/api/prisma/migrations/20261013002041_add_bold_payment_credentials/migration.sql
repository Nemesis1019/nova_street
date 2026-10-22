-- AlterTable
ALTER TABLE "store_configs" ADD COLUMN     "boldApiKey" TEXT,
ADD COLUMN     "boldSandbox" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "boldSecretKey" TEXT;
