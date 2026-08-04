-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "metaDescription" TEXT,
ADD COLUMN     "metaTitle" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "metaDescription" TEXT,
ADD COLUMN     "metaTitle" TEXT;
