export enum OrderStatus {
  PendingPayment = 'PENDING_PAYMENT',
  Paid = 'PAID',
  InProduction = 'IN_PRODUCTION',
  ReadyToShip = 'READY_TO_SHIP',
  Shipped = 'SHIPPED',
  Delivered = 'DELIVERED',
  Cancelled = 'CANCELLED',
  Refunded = 'REFUNDED',
}

export enum PaymentStatus {
  Pending = 'PENDING',
  Authorized = 'AUTHORIZED',
  Paid = 'PAID',
  Failed = 'FAILED',
  Refunded = 'REFUNDED',
}

export enum StockMode {
  MadeToOrder = 'MADE_TO_ORDER',
  Tracked = 'TRACKED',
}

export enum OrderItemProductionStatus {
  PendingProduction = 'PENDING_PRODUCTION',
  InProduction = 'IN_PRODUCTION',
  QualityCheck = 'QUALITY_CHECK',
  ReadyToShip = 'READY_TO_SHIP',
}

export enum CartItemType {
  Standard = 'STANDARD',
  Custom = 'CUSTOM',
}

export enum CustomDesignStatus {
  Draft = 'DRAFT',
  PendingReview = 'PENDING_REVIEW',
  Approved = 'APPROVED',
  Rejected = 'REJECTED',
}

export enum CustomDesignElementType {
  UploadedImage = 'UPLOADED_IMAGE',
  Text = 'TEXT',
  Clipart = 'CLIPART',
}

export enum AssetPurpose {
  CatalogImage = 'CATALOG_IMAGE',
  CustomDesignAsset = 'CUSTOM_DESIGN_ASSET',
  PrintFile = 'PRINT_FILE',
}

export enum ShipmentStatus {
  Pending = 'PENDING',
  InTransit = 'IN_TRANSIT',
  Delivered = 'DELIVERED',
  Cancelled = 'CANCELLED',
}

export enum RefundStatus {
  Pending = 'PENDING',
  Completed = 'COMPLETED',
  Failed = 'FAILED',
}

export const DEFAULT_CURRENCY_CODE = 'COP';

