import { StockPolicy } from './stock-policy.interface';

export class MadeToOrderStockPolicy implements StockPolicy {
  async isAvailable(): Promise<boolean> {
    return true;
  }

  async reserve(): Promise<void> {
    // No-op: made-to-order items do not reserve physical inventory.
  }

  async release(): Promise<void> {
    // No-op.
  }

  async commit(): Promise<void> {
    // No-op.
  }
}
