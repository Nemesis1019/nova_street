export interface StockPolicyContext {
  cartId?: string;
  orderId?: string;
}

export interface StockPolicy {
  isAvailable(variantId: string, quantity: number): Promise<boolean>;
  reserve(variantId: string, quantity: number, context: StockPolicyContext): Promise<void>;
  release(variantId: string, quantity: number, context: StockPolicyContext): Promise<void>;
  commit(variantId: string, quantity: number, context: StockPolicyContext): Promise<void>;
}
