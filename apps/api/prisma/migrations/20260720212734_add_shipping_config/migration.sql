-- AlterTable
ALTER TABLE "store_configs" ADD COLUMN     "freeShippingThreshold" INTEGER,
ADD COLUMN     "shippingBaseCost" INTEGER NOT NULL DEFAULT 10000,
ADD COLUMN     "shippingDiscountFixedAmount" INTEGER,
ADD COLUMN     "shippingDiscountPercentage" INTEGER,
ADD COLUMN     "shippingProvider" TEXT NOT NULL DEFAULT 'flatRate';
