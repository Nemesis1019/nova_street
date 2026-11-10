-- Crop persistente por asset: foco y zoom aplicables a imágenes de producto.
ALTER TABLE "assets"
  ADD COLUMN "focalPointX" DOUBLE PRECISION NOT NULL DEFAULT 50,
  ADD COLUMN "focalPointY" DOUBLE PRECISION NOT NULL DEFAULT 50,
  ADD COLUMN "cropZoom" DOUBLE PRECISION NOT NULL DEFAULT 1;
