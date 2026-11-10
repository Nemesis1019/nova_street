-- Eventos first-party de experimentos A/B del storefront.
CREATE TABLE "storefront_experiment_events" (
  "id" UUID NOT NULL,
  "experimentId" TEXT NOT NULL,
  "variant" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "visitorId" TEXT,
  "path" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "storefront_experiment_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "storefront_experiment_events_experimentId_event_createdAt_idx"
  ON "storefront_experiment_events"("experimentId", "event", "createdAt");
