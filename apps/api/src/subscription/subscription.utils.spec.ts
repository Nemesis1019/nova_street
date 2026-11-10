import { createHash, createHmac } from 'node:crypto';

import {
  addDays,
  buildBoldIntegritySignature,
  buildBoldWebhookSignature,
  isSubscriptionPaid,
  isValidBoldWebhookSignature,
  resolveSubscriptionStatus,
} from './subscription.utils';

const NOW = new Date('2026-10-24T12:00:00.000Z');

describe('subscription.utils', () => {
  describe('resolveSubscriptionStatus', () => {
    it('mantiene ACTIVE si paidUntil está en el futuro', () => {
      expect(
        resolveSubscriptionStatus(
          {
            subscriptionStatus: 'ACTIVE',
            subscriptionPaidUntil: new Date('2026-11-24T12:00:00.000Z'),
          },
          NOW,
        ),
      ).toBe('ACTIVE');
    });

    it('marca PAST_DUE durante la gracia y SUSPENDED al terminarla', () => {
      expect(
        resolveSubscriptionStatus(
          {
            subscriptionStatus: 'ACTIVE',
            subscriptionPaidUntil: new Date('2026-10-23T12:00:00.000Z'),
          },
          NOW,
          3,
        ),
      ).toBe('PAST_DUE');
      expect(
        resolveSubscriptionStatus(
          {
            subscriptionStatus: 'ACTIVE',
            subscriptionPaidUntil: new Date('2026-10-20T12:00:00.000Z'),
          },
          NOW,
          3,
        ),
      ).toBe('SUSPENDED');
    });

    it('respeta la suspensión manual aunque la fecha esté vigente', () => {
      expect(
        resolveSubscriptionStatus(
          {
            subscriptionStatus: 'SUSPENDED',
            subscriptionPaidUntil: new Date('2026-12-24T12:00:00.000Z'),
          },
          NOW,
        ),
      ).toBe('SUSPENDED');
    });

    it('mantiene TRIAL sin pago y sin vencimiento', () => {
      expect(
        resolveSubscriptionStatus({ subscriptionStatus: 'TRIAL', subscriptionPaidUntil: null }, NOW),
      ).toBe('TRIAL');
    });

    it('respeta CANCELED aunque haya una fecha de pago', () => {
      expect(
        resolveSubscriptionStatus(
          {
            subscriptionStatus: 'CANCELED',
            subscriptionPaidUntil: new Date('2026-12-24T12:00:00.000Z'),
          },
          NOW,
        ),
      ).toBe('CANCELED');
    });
  });

  describe('isSubscriptionPaid', () => {
    it('sólo es true con vencimiento futuro', () => {
      expect(
        isSubscriptionPaid(
          {
            subscriptionStatus: 'ACTIVE',
            subscriptionPaidUntil: new Date('2026-11-24T12:00:00.000Z'),
          },
          NOW,
        ),
      ).toBe(true);
      expect(
        isSubscriptionPaid(
          {
            subscriptionStatus: 'ACTIVE',
            subscriptionPaidUntil: new Date('2026-10-01T12:00:00.000Z'),
          },
          NOW,
        ),
      ).toBe(false);
    });
  });

  it('suma días sin mutar la fecha original', () => {
    const base = new Date('2026-10-24T00:00:00.000Z');
    expect(addDays(base, 30).toISOString()).toBe('2026-11-23T00:00:00.000Z');
    expect(base.toISOString()).toBe('2026-10-24T00:00:00.000Z');
  });

  it('genera el hash de integridad de Bold con el formato documentado', () => {
    const hash = buildBoldIntegritySignature('sub_ref_1', 99000, 'COP', 'secret_platform');
    const expected = createHash('sha256')
      .update('sub_ref_199000COPsecret_platform')
      .digest('hex');
    expect(hash).toBe(expected);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('valida la firma HMAC del webhook Bold sobre base64', () => {
    const raw = Buffer.from(
      JSON.stringify({ type: 'SALE_APPROVED', data: { metadata: { reference: 'sub_ref_1' } } }),
    );
    const signature = createHmac('sha256', 'secret_platform')
      .update(raw.toString('base64'))
      .digest('hex');

    expect(buildBoldWebhookSignature(raw, 'secret_platform')).toBe(signature);
    expect(isValidBoldWebhookSignature(raw, signature, 'secret_platform')).toBe(true);
    expect(isValidBoldWebhookSignature(raw, 'deadbeef', 'secret_platform')).toBe(false);
    expect(isValidBoldWebhookSignature(raw, undefined, 'secret_platform')).toBe(false);
  });

  it('en sandbox acepta webhooks sin firma', () => {
    const raw = Buffer.from('{}');
    expect(isValidBoldWebhookSignature(raw, undefined, '')).toBe(true);
  });
});
