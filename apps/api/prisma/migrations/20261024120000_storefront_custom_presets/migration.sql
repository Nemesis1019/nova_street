-- Presets propios por tenant (documentos completos reutilizables).
ALTER TABLE "store_configs"
  ADD COLUMN "storefrontPresets" JSONB;
