-- Storefront personalizable: documento draft/published y revisiones por tenant.
ALTER TABLE "store_configs"
  ADD COLUMN "storefrontDraft" JSONB,
  ADD COLUMN "storefrontPublished" JSONB,
  ADD COLUMN "storefrontVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "storefront_revisions" (
  "id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "storefront_revisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "storefront_revisions_version_key" ON "storefront_revisions"("version");
