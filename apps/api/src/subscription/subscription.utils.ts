import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import type { SubscriptionStatus } from '@prisma/master-client';

export interface SubscriptionStatusInput {
  subscriptionStatus: SubscriptionStatus;
  subscriptionPaidUntil: Date | null;
}

/**
 * Estado comercial efectivo. No se persiste en cada lectura: si un pago venció,
 * el cliente ve PAST_DUE aunque el último estado guardado sea ACTIVE.
 */
export function resolveSubscriptionStatus(
  tenant: SubscriptionStatusInput,
  now = new Date(),
  graceDays = 3,
): SubscriptionStatus {
  if (tenant.subscriptionStatus === 'CANCELED') return 'CANCELED';
  if (tenant.subscriptionStatus === 'SUSPENDED') return 'SUSPENDED';

  if (tenant.subscriptionPaidUntil && tenant.subscriptionPaidUntil.getTime() > now.getTime()) {
    return 'ACTIVE';
  }

  if (tenant.subscriptionStatus === 'TRIAL' && !tenant.subscriptionPaidUntil) {
    return 'TRIAL';
  }

  if (tenant.subscriptionPaidUntil) {
    const graceEndsAt = addDays(tenant.subscriptionPaidUntil, graceDays).getTime();
    if (now.getTime() > graceEndsAt) return 'SUSPENDED';
  }

  return 'PAST_DUE';
}

export function isSubscriptionPaid(
  tenant: SubscriptionStatusInput,
  now = new Date(),
  graceDays = 3,
): boolean {
  return resolveSubscriptionStatus(tenant, now, graceDays) === 'ACTIVE';
}

/** Días de gracia antes de bloquear el storefront por falta de pago. */
export function subscriptionGraceDays(): number {
  const value = Number(process.env.SUBSCRIPTION_GRACE_DAYS ?? 3);
  return Number.isFinite(value) && value >= 0 && value <= 60 ? Math.floor(value) : 3;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Hash de integridad del botón de Bold: SHA256(reference + amount + currency + secret). */
export function buildBoldIntegritySignature(
  reference: string,
  amount: number,
  currency: string,
  secretKey: string,
): string {
  return createHash('sha256')
    .update(`${reference}${amount}${currency}${secretKey}`)
    .digest('hex');
}

/** Firma HMAC-SHA256 del webhook Bold sobre el body en base64. */
export function buildBoldWebhookSignature(rawBody: Buffer, secretKey: string): string {
  return createHmac('sha256', secretKey).update(rawBody.toString('base64')).digest('hex');
}

export function isValidBoldWebhookSignature(
  rawBody: Buffer,
  signature: string | undefined,
  secretKey: string,
): boolean {
  if (!secretKey) return true;
  if (!signature) return false;

  const expected = buildBoldWebhookSignature(rawBody, secretKey);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  return (
    expectedBuffer.length === signatureBuffer.length &&
    timingSafeEqual(expectedBuffer, signatureBuffer)
  );
}

export interface BoldWebhookBody {
  type?: string;
  subject?: string;
  data?: {
    payment_id?: string;
    payer_email?: string;
    amount?: { total?: number; currency?: string };
    metadata?: { reference?: string };
  };
}
