-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "r2AccessKeyId" TEXT,
ADD COLUMN     "r2Bucket" TEXT,
ADD COLUMN     "r2Endpoint" TEXT,
ADD COLUMN     "r2PublicUrl" TEXT,
ADD COLUMN     "r2SecretAccessKey" TEXT;
