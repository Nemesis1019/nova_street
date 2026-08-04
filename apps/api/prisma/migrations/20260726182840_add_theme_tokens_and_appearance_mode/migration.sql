-- CreateEnum
CREATE TYPE "appearance_mode" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- AlterTable
ALTER TABLE "store_configs" ADD COLUMN     "appearanceMode" "appearance_mode" NOT NULL DEFAULT 'LIGHT',
ADD COLUMN     "borderColor" TEXT NOT NULL DEFAULT '#0d0d0d',
ADD COLUMN     "darkBackgroundColor" TEXT NOT NULL DEFAULT '#0d0d0d',
ADD COLUMN     "darkTextColor" TEXT NOT NULL DEFAULT '#f5f5f5',
ADD COLUMN     "errorColor" TEXT NOT NULL DEFAULT '#e03131',
ADD COLUMN     "successColor" TEXT NOT NULL DEFAULT '#2f9e44',
ADD COLUMN     "surfaceColor" TEXT NOT NULL DEFAULT '#ffffff',
ADD COLUMN     "surfaceMutedColor" TEXT NOT NULL DEFAULT '#f6f3f2',
ADD COLUMN     "warningColor" TEXT NOT NULL DEFAULT '#f76707';
