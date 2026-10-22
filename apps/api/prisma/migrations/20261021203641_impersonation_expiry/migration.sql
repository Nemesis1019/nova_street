-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "impersonatedAt" TIMESTAMP(3),
ADD COLUMN     "impersonatedBy" UUID;
