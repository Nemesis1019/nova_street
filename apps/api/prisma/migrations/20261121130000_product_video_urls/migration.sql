ALTER TABLE "products"
    ADD COLUMN "videoUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "products"
SET "videoUrls" = ARRAY["videoUrl"]
WHERE "videoUrl" IS NOT NULL AND "videoUrl" <> '';
