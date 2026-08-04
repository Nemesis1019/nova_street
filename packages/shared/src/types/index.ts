import type {
  AssetPurpose,
  CartItemType,
  CustomDesignElementType,
  CustomDesignStatus,
  OrderItemProductionStatus,
  OrderStatus,
  PaymentStatus,
  RefundStatus,
  ShipmentStatus,
  StockMode,
} from '../enums';

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

export interface Address extends BaseEntity {
  userId: string;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  isDefault: boolean;
}

export interface Category extends BaseEntity {
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
}

export interface Product extends BaseEntity {
  name: string;
  slug: string;
  description?: string;
  categoryId?: string;
  basePrice: number;
  isActive: boolean;
}

export interface ProductVariant extends BaseEntity {
  productId: string;
  sku: string;
  size?: string;
  color?: string;
  garmentType?: string;
  stockMode: StockMode;
  productionLeadTimeDays: number;
}

export interface Inventory extends BaseEntity {
  productVariantId: string;
  quantity: number;
  reservedQuantity: number;
}

export interface StoreSettings extends BaseEntity {
  defaultStockMode: StockMode;
  productionLeadTimeDaysDefault: number;
  updatedById?: string;
}

export interface Cart {
  id: string;
  userId?: string;
  items: CartItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem extends BaseEntity {
  cartId: string;
  type: CartItemType;
  productVariantId?: string;
  customDesignId?: string;
  quantity: number;
  unitPrice: number;
}

export interface Order extends BaseEntity {
  userId?: string;
  status: OrderStatus;
  totalAmount: number;
  shippingAddressId?: string;
  billingAddressId?: string;
}

export interface OrderItem extends BaseEntity {
  orderId: string;
  type: CartItemType;
  productVariantId?: string;
  customDesignId?: string;
  quantity: number;
  unitPrice: number;
  productionStatus: OrderItemProductionStatus;
}

export interface Payment extends BaseEntity {
  orderId: string;
  provider: string;
  providerTransactionId?: string;
  amount: number;
  status: PaymentStatus;
}

export interface Coupon extends BaseEntity {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  validFrom: Date;
  validUntil?: Date;
  maxUses?: number;
  usedCount: number;
  isActive: boolean;
}

export interface Review extends BaseEntity {
  productId: string;
  userId: string;
  orderId?: string;
  rating: number;
  comment?: string;
  isApproved: boolean;
}

export interface Shipment extends BaseEntity {
  orderId: string;
  carrier: string;
  trackingNumber: string;
  status: ShipmentStatus;
  shippedAt?: Date;
  deliveredAt?: Date;
  notes?: string;
}

export interface Refund extends BaseEntity {
  orderId: string;
  paymentId?: string;
  amount: number;
  reason: string;
  status: RefundStatus;
  providerRefundId?: string;
  createdById?: string;
}

export interface DesignTemplate extends BaseEntity {
  name: string;
  garmentType: string;
  baseImageUrl: string;
  printAreas: PrintArea[];
  basePrice: number;
  availableColors: string[];
  availableSizes: string[];
  stockMode: StockMode;
  productionLeadTimeDays: number;
}

export interface PrintArea {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CustomDesign extends BaseEntity {
  userId: string;
  designTemplateId: string;
  status: CustomDesignStatus;
  previewImageUrl?: string;
  finalPrintFileUrl?: string;
  surcharge: number;
}

export interface CustomDesignElement extends BaseEntity {
  customDesignId: string;
  type: CustomDesignElementType;
  assetUrl?: string;
  textContent?: string;
  positionX: number;
  positionY: number;
  scale: number;
  rotation: number;
  zIndex: number;
}

export interface Asset extends BaseEntity {
  ownerId?: string;
  purpose: AssetPurpose;
  relatedId?: string;
  bucket: string;
  objectKey: string;
  mimeType: string;
  size: number;
  uploadedById?: string;
}

export interface AuditLog extends BaseEntity {
  userId?: string;
  action: string;
  entity: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}
