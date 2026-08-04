-- AlterTable
ALTER TABLE "custom_designs" ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" UUID;

-- AlterTable
ALTER TABLE "store_configs" ADD COLUMN     "enableCatalogFilters" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "enableCustomDesigns" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "enableNewsletter" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maintenanceMessage" TEXT,
ADD COLUMN     "maintenanceMode" BOOLEAN NOT NULL DEFAULT false;
