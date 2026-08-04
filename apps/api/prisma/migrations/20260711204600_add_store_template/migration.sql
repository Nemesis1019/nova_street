-- AlterTable
ALTER TABLE "store_configs" ADD COLUMN     "template" TEXT NOT NULL DEFAULT 'storefront',
ADD COLUMN     "templateConfig" JSONB DEFAULT '{}';
