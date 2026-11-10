ALTER TABLE "design_templates"
    ADD COLUMN "model3dRotationY" INTEGER NOT NULL DEFAULT 180;

ALTER TABLE "custom_designs"
    ADD COLUMN "printFiles" JSONB;
