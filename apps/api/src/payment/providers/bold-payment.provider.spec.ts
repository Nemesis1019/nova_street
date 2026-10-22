import { createHash, createHmac } from 'node:crypto';

import { BoldPaymentProvider } from './bold-payment.provider';

const SECRET = 'test_secret_key';

function buildProvider(overrides: { apiKey?: string | null; secretKey?: string; sandbox?: boolean } = {}) {
  const prisma = {
    storeConfig: {
      findFirst: jest.fn().mockResolvedValue({
        boldApiKey: overrides.apiKey === undefined ? 'identity_key' : overrides.apiKey,
        boldSecretKey: overrides.secretKey ?? SECRET,
        boldSandbox: overrides.sandbox ?? false,
      }),
    },
  };
  const configService = { get: jest.fn().mockReturnValue(undefined) };
  return new BoldPaymentProvider(prisma as never, configService as never);
}

describe('BoldPaymentProvider', () => {
  describe('buildIntegritySignature', () => {
    it('genera SHA256(orderId + amount + currency + secret) como en la doc de Bold', () => {
      const provider = buildProvider();
      // Ejemplo de la documentación: inv0334 + 39400 + COP + llave secreta
      const hash = provider.buildIntegritySignature('inv0334', 39400, 'COP', 'kgfq2nN0o52XqnuXZWIN2F');
      const expected = createHash('sha256').update('inv033439400COPkgfq2nN0o52XqnuXZWIN2F').digest('hex');
      expect(hash).toBe(expected);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('handleWebhook', () => {
    const approvedBody = JSON.stringify({
      id: 'evt-1',
      type: 'SALE_APPROVED',
      subject: 'BOLD-TX-1',
      data: {
        payment_id: 'PAY-123',
        metadata: { reference: 'order-uuid-1' },
        amount: { total: 95000, currency: 'COP' },
      },
    });

    it('mapea SALE_APPROVED a checkout.session.completed con la referencia de la orden', async () => {
      const provider = buildProvider();
      const signature = createHmac('sha256', SECRET)
        .update(Buffer.from(approvedBody).toString('base64'))
        .digest('hex');

      const event = await provider.handleWebhook(Buffer.from(approvedBody), signature);

      expect(event).toEqual({
        type: 'checkout.session.completed',
        orderId: 'order-uuid-1',
        providerTransactionId: 'PAY-123',
      });
    });

    it('rechaza firmas inválidas', async () => {
      const provider = buildProvider();
      await expect(provider.handleWebhook(Buffer.from(approvedBody), 'deadbeef')).rejects.toThrow(
        'Invalid signature',
      );
    });

    it('rechaza webhooks sin header de firma cuando hay llave secreta', async () => {
      const provider = buildProvider();
      await expect(provider.handleWebhook(Buffer.from(approvedBody), undefined)).rejects.toThrow(
        'Missing x-bold-signature header',
      );
    });

    it('mapea SALE_REJECTED a payment_failed', async () => {
      const provider = buildProvider();
      const body = JSON.stringify({
        type: 'SALE_REJECTED',
        subject: 'BOLD-TX-2',
        data: { payment_id: 'PAY-999', metadata: { reference: 'order-uuid-2' } },
      });
      const signature = createHmac('sha256', SECRET).update(Buffer.from(body).toString('base64')).digest('hex');

      const event = await provider.handleWebhook(Buffer.from(body), signature);

      expect(event).toEqual({
        type: 'payment_failed',
        orderId: 'order-uuid-2',
        providerTransactionId: 'PAY-999',
      });
    });

    it('en sandbox (clave vacía) procesa sin verificar firma', async () => {
      const provider = buildProvider({ sandbox: true });
      const event = await provider.handleWebhook(Buffer.from(approvedBody), undefined);
      expect(event.type).toBe('checkout.session.completed');
      expect(event.orderId).toBe('order-uuid-1');
    });

    it('ignora eventos desconocidos', async () => {
      const provider = buildProvider();
      const body = JSON.stringify({ type: 'VOID_APPROVED', subject: 'X' });
      const signature = createHmac('sha256', SECRET).update(Buffer.from(body).toString('base64')).digest('hex');
      const event = await provider.handleWebhook(Buffer.from(body), signature);
      expect(event.type).toBe('unknown');
    });
  });

  describe('createButtonCheckout', () => {
    it('devuelve la config del botón con firma y redirección al storefront', async () => {
      const provider = buildProvider();
      const config = await provider.createButtonCheckout({
        id: 'order-1',
        totalAmount: 95000,
        currency: 'cop',
        userEmail: 'cliente@example.com',
      });

      expect(config.apiKey).toBe('identity_key');
      expect(config.currency).toBe('COP');
      expect(config.amount).toBe(95000);
      expect(config.redirectionUrl).toContain('/checkout/confirmacion?order=order-1');
      expect(config.integritySignature).toBe(provider.buildIntegritySignature('order-1', 95000, 'COP', SECRET));
      expect(config.sandbox).toBe(false);
    });

    it('falla si no hay llave de identidad configurada', async () => {
      const provider = buildProvider({ apiKey: null });
      await expect(
        provider.createButtonCheckout({
          id: 'order-1',
          totalAmount: 1000,
          currency: 'COP',
          userEmail: 'a@b.co',
        }),
      ).rejects.toThrow('Bold is not configured');
    });
  });
});
