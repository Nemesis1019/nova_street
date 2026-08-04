-- CreateEnum
CREATE TYPE "CouponAppliesTo" AS ENUM ('ALL', 'CATEGORY', 'PRODUCT');

-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "appliesTo" "CouponAppliesTo" NOT NULL DEFAULT 'ALL',
ADD COLUMN     "categoryId" UUID,
ADD COLUMN     "isFirstPurchaseOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxUsesPerUser" INTEGER,
ADD COLUMN     "minOrderAmount" INTEGER,
ADD COLUMN     "productId" UUID;

-- CreateTable
CREATE TABLE "coupon_usages" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "couponId" UUID NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupon_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coupon_usages_couponId_idx" ON "coupon_usages"("couponId");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_usages_userId_couponId_key" ON "coupon_usages"("userId", "couponId");

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
