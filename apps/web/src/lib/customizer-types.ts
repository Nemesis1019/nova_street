import type {
  CustomizerColorOption,
  CustomizerPriceResult,
  CustomizerPricingRules,
  CustomizerPrintZone,
  CustomizerSizeOption,
} from '@ecommerce/shared';

export interface DesignTemplate {
  id: string;
  name: string;
  garmentType: string;
  description?: string | null;
  baseImageUrl: string;
  thumbnailUrl?: string | null;
  model3dUrl?: string | null;
  model3dRotationY?: number;
  printAreas: Record<string, unknown>;
  basePrice: number;
  availableColors: string[];
  availableSizes: string[];
  colors?: CustomizerColorOption[];
  sizes?: CustomizerSizeOption[];
  zones?: CustomizerPrintZone[];
  pricing?: CustomizerPricingRules;
  pricingRules?: unknown;
  stockMode: string;
  productionLeadTimeDays: number;
  isActive?: boolean;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomDesign {
  id: string;
  userId: string;
  designTemplateId: string;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  color: string | null;
  size: string | null;
  previewImageUrl: string | null;
  finalPrintFileUrl: string | null;
  surcharge: number;
  pricingBreakdown?: CustomizerPriceResult | null;
  printFiles?: Array<{
    zoneKey: string;
    assetUrl: string;
    dpi: number;
    widthCm: number;
    heightCm: number;
    printMethod: 'DTG' | 'DTF' | 'SCREEN' | 'EMBROIDERY';
    mirrored: boolean;
  }> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomDesignElement {
  id?: string;
  type: 'UPLOADED_IMAGE' | 'TEXT' | 'CLIPART';
  printAreaKey?: string | null;
  assetUrl?: string | null;
  textContent?: string | null;
  fontFamily?: string | null;
  fontWeight?: number | null;
  fontSize?: number;
  fill?: string;
  positionX: number;
  positionY: number;
  scale: number;
  rotation: number;
  zIndex: number;
  width?: number | null;
  height?: number | null;
}
