-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE 'SUSPENDED';

-- AlterTable
ALTER TABLE "tenants"
    ADD COLUMN "subscriptionSuspendedAt" TIMESTAMP(3),
    ADD COLUMN "subscriptionPlanId" UUID;

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "periodDays" INTEGER NOT NULL DEFAULT 30,
    "features" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_slug_key" ON "subscription_plans"("slug");

-- Seed plans
INSERT INTO "subscription_plans" ("id", "slug", "name", "description", "amount", "currency", "periodDays", "features", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('11111111-1111-4111-8111-111111111111', 'starter', 'Starter', 'Para tiendas que están empezando.', 49000, 'COP', 30, '["Hasta 500 productos","1 tienda","Soporte estándar"]'::jsonb, true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('22222222-2222-4222-8222-222222222222', 'pro', 'Pro', 'Para marcas en crecimiento.', 99000, 'COP', 30, '["Productos ilimitados","Diseño avanzado","Soporte prioritario"]'::jsonb, true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('33333333-3333-4333-8333-333333333333', 'business', 'Business', 'Para operaciones con alto volumen.', 199000, 'COP', 30, '["Multi-sucursal","Analítica avanzada","Soporte dedicado"]'::jsonb, true, 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

-- Existing tenants start on Pro.
UPDATE "tenants"
SET "subscriptionPlanId" = '22222222-2222-4222-8222-222222222222'
WHERE "subscriptionPlanId" IS NULL;

-- AlterTable payment snapshot
ALTER TABLE "subscription_payments"
    ADD COLUMN "planId" UUID,
    ADD COLUMN "planName" TEXT;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_subscriptionPlanId_fkey" FOREIGN KEY ("subscriptionPlanId") REFERENCES "subscription_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
