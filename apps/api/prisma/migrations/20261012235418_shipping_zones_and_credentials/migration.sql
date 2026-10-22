-- AlterTable
ALTER TABLE "shipping_options" ADD COLUMN     "coverageZones" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "store_configs" ADD COLUMN     "shippingAccountId" TEXT,
ADD COLUMN     "shippingApiKey" TEXT,
ADD COLUMN     "shippingApiUrl" TEXT;
