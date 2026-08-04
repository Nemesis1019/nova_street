-- AlterTable
ALTER TABLE "custom_design_elements" ADD COLUMN     "fill" TEXT NOT NULL DEFAULT '#0d0d0d',
ADD COLUMN     "fontSize" INTEGER NOT NULL DEFAULT 24;

-- AlterTable
ALTER TABLE "custom_designs" ADD COLUMN     "color" TEXT,
ADD COLUMN     "size" TEXT;
