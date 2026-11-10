-- Workflow opt-in de aprobación de publicación del storefront.
ALTER TABLE "store_configs"
  ADD COLUMN "requireStorefrontApproval" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "storefrontApprovalStatus" TEXT NOT NULL DEFAULT 'NONE',
  ADD COLUMN "storefrontApprovalDraftHash" TEXT,
  ADD COLUMN "storefrontApprovalRequestedAt" TIMESTAMP(3),
  ADD COLUMN "storefrontApprovalRequestedById" UUID,
  ADD COLUMN "storefrontApprovalReviewedAt" TIMESTAMP(3),
  ADD COLUMN "storefrontApprovalReviewedById" UUID,
  ADD COLUMN "storefrontApprovalNote" TEXT;
