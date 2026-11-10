-- Personalizador v2: catálogo editable, zonas, pricing y preparación 3D.

ALTER TABLE "design_templates"
    ADD COLUMN "description" TEXT,
    ADD COLUMN "thumbnailUrl" TEXT,
    ADD COLUMN "model3dUrl" TEXT,
    ADD COLUMN "colorOptions" JSONB,
    ADD COLUMN "sizeOptions" JSONB,
    ADD COLUMN "pricingRules" JSONB,
    ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "design_templates_isActive_sortOrder_idx" ON "design_templates"("isActive", "sortOrder");

ALTER TABLE "custom_designs"
    ADD COLUMN "pricingBreakdown" JSONB;

ALTER TABLE "custom_design_elements"
    ADD COLUMN "printAreaKey" TEXT,
    ADD COLUMN "fontFamily" TEXT,
    ADD COLUMN "fontWeight" INTEGER,
    ADD COLUMN "width" DOUBLE PRECISION,
    ADD COLUMN "height" DOUBLE PRECISION;
