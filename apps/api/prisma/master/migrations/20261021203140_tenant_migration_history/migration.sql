-- CreateTable
CREATE TABLE "tenant_migrations" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    "error" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_migrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_migrations_tenantId_createdAt_idx" ON "tenant_migrations"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "tenant_migrations" ADD CONSTRAINT "tenant_migrations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
