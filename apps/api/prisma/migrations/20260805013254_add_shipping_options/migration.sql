-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "shippingOptionId" UUID;

-- CreateTable
CREATE TABLE "shipping_options" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "estimatedDaysMin" INTEGER,
    "estimatedDaysMax" INTEGER,
    "freeShippingThreshold" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_options_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shippingOptionId_fkey" FOREIGN KEY ("shippingOptionId") REFERENCES "shipping_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
