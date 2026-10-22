export interface NotificationEvent {
  type: 'order.created' | 'payment.failed' | 'stock.low' | 'review.pending' | 'user.registered';
  payload: Record<string, unknown>;
  /** Tenant que originó el evento (aislamiento del stream SSE). */
  tenantSlug?: string;
  createdAt: string;
}
