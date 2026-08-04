export interface DesignTemplate {
  id: string;
  name: string;
  garmentType: string;
  baseImageUrl: string;
  printAreas: Record<string, unknown>;
  basePrice: number;
  availableColors: string[];
  availableSizes: string[];
  stockMode: string;
  productionLeadTimeDays: number;
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
  createdAt: string;
  updatedAt: string;
}

export interface CustomDesignElement {
  id?: string;
  type: 'UPLOADED_IMAGE' | 'TEXT' | 'CLIPART';
  assetUrl?: string;
  textContent?: string;
  fontSize?: number;
  fill?: string;
  positionX: number;
  positionY: number;
  scale: number;
  rotation: number;
  zIndex: number;
}
