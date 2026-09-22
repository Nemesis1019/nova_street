export interface NotificationEvent {
  type: 'order.created' | 'payment.failed' | 'stock.low' | 'review.pending' | 'user.registered';
  payload: Record<string, unknown>;
  createdAt: string;
}
