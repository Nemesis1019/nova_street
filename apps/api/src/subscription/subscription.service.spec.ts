import { createHash, createHmac } from 'node:crypto';

import { SubscriptionService } from './subscription.service';

const SECRET = 'platform_secret';

function buildService(status: 'PENDING' | 'PAID' | 'FAILED' = 'PENDING') {
  const payment = {
    id: 'payment-1',
    tenantId: 'tenant-1',
    reference: 'sub_ref_1',
    amount: 99000,
    currency: 'COP',
    periodDays: 30,
    status,
    provider: 'bold',
    planId: 'plan-2',
    planName: 'Business',
    providerTransactionId: null,
    paidAt: null,
    metadata: null,
    createdAt: new Date('2026-10-24T12:00:00.000Z'),
    updatedAt: new Date('2026-10-24T12:00:00.000Z'),
  };
  const tenant = {
    id: 'tenant-1',
    slug: 'acme',
    name: 'Acme',
    subscriptionStatus: 'PAST_DUE',
    subscriptionPaidUntil: new Date('2026-10-01T12:00:00.000Z'),
    subscriptionSuspendedAt: null,
    subscriptionLastPaymentAt: null,
    subscriptionLastPaymentAmount: null,
    subscriptionLastPaymentCurrency: null,
    subscriptionPlanId: null,
    subscriptionPlan: null,
  };

  const tx = {
    subscriptionPayment: {
      findUnique: jest.fn().mockResolvedValue(payment),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({ ...payment, status: 'PAID' }),
    },
    tenant: {
      findUnique: jest.fn().mockResolvedValue(tenant),
      update: jest.fn().mockResolvedValue(tenant),
    },
  };

  const master = {
    subscriptionPayment: {
      findUnique: jest.fn().mockResolvedValue(payment),
      update: jest.fn().mockResolvedValue({ ...payment, status: 'FAILED' }),
    },
    $transaction: jest.fn((callback: (client: typeof tx) => Promise<void>) => callback(tx)),
  };

  const config = {
    get: jest.fn((key: string) => {
      if (key === 'SUBSCRIPTION_BOLD_SECRET_KEY') return SECRET;
      return undefined;
    }),
  };

  const registry = { invalidate: jest.fn() };

  return {
    service: new SubscriptionService(master as never, config as never, registry as never),
    master,
    tx,
    payment,
    registry,
  };
}

function signed(body: unknown, secret = SECRET) {
  const raw = Buffer.from(JSON.stringify(body));
  return {
    raw,
    signature: createHmac('sha256', secret).update(raw.toString('base64')).digest('hex'),
  };
}

describe('SubscriptionService — checkout', () => {
  it('crea un intento pendiente con el monto del plan y firma el botón Bold', async () => {
    const plan = {
      id: 'plan-pro',
      slug: 'pro',
      name: 'Pro',
      description: null,
      amount: 99000,
      currency: 'COP',
      periodDays: 30,
      features: [],
      isActive: true,
      sortOrder: 20,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const tenant = {
      id: 'tenant-1',
      slug: 'acme',
      name: 'Acme',
      subscriptionStatus: 'TRIAL',
      subscriptionPaidUntil: null,
      subscriptionSuspendedAt: null,
      subscriptionLastPaymentAt: null,
      subscriptionLastPaymentAmount: null,
      subscriptionLastPaymentCurrency: null,
      subscriptionPlanId: plan.id,
      subscriptionPlan: plan,
    };
    const payment = {
      id: 'payment-1',
      tenantId: 'tenant-1',
      reference: 'sub_acme_1',
      amount: 99000,
      currency: 'COP',
      periodDays: 30,
      status: 'PENDING',
      planId: plan.id,
      planName: plan.name,
    };
    const master = {
      tenant: { findUnique: jest.fn().mockResolvedValue(tenant) },
      subscriptionPlan: { findFirst: jest.fn().mockResolvedValue(plan) },
      subscriptionPayment: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(payment),
      },
    };
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'SUBSCRIPTION_BOLD_API_KEY') return 'identity_key';
        if (key === 'SUBSCRIPTION_BOLD_SECRET_KEY') return SECRET;
        if (key === 'ADMIN_URL') return 'https://admin.nova.test/';
        return undefined;
      }),
    };
    const service = new SubscriptionService(master as never, config as never, { invalidate: jest.fn() } as never);

    const checkout = await service.createCheckoutForTenantId('tenant-1');

    expect(checkout).toEqual(
      expect.objectContaining({
        apiKey: 'identity_key',
        orderId: 'sub_acme_1',
        amount: 99000,
        currency: 'COP',
        reference: 'sub_acme_1',
        planId: plan.id,
        planName: 'Pro',
        periodDays: 30,
        redirectionUrl:
          'https://admin.nova.test/subscription?subscription=return&reference=sub_acme_1',
      }),
    );
    expect(checkout.integritySignature).toBe(
      createHash('sha256').update(`sub_acme_199000COP${SECRET}`).digest('hex'),
    );
  });
});

describe('SubscriptionService — webhook Bold', () => {
  it('aprueba el pago y extiende la suscripción desde el vencimiento anterior', async () => {
    const { service, master, tx } = buildService();
    const { raw, signature } = signed({
      type: 'SALE_APPROVED',
      subject: 'BOLD-TX-1',
      data: {
        payment_id: 'PAY-123',
        metadata: { reference: 'sub_ref_1' },
        amount: { total: 99000, currency: 'COP' },
      },
    });

    await expect(service.handleBoldWebhook(raw, signature)).resolves.toEqual({ received: true });

    expect(master.$transaction).toHaveBeenCalled();
    expect(tx.subscriptionPayment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'payment-1', status: { not: 'PAID' } },
        data: expect.objectContaining({
          status: 'PAID',
          providerTransactionId: 'PAY-123',
        }),
      }),
    );
    expect(tx.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tenant-1' },
        data: expect.objectContaining({
          subscriptionStatus: 'ACTIVE',
          subscriptionLastPaymentAmount: 99000,
          subscriptionLastPaymentCurrency: 'COP',
          subscriptionPlanId: 'plan-2',
        }),
      }),
    );

    const update = tx.tenant.update.mock.calls[0][0] as {
      data: { subscriptionPaidUntil: Date };
    };
    expect(update.data.subscriptionPaidUntil.getTime()).toBeGreaterThan(Date.now());
  });

  it('es idempotente con un pago ya aprobado', async () => {
    const { service, master, tx } = buildService('PAID');
    const { raw, signature } = signed({
      type: 'SALE_APPROVED',
      data: { metadata: { reference: 'sub_ref_1' } },
    });

    await service.handleBoldWebhook(raw, signature);

    expect(master.$transaction).toHaveBeenCalled();
    expect(tx.tenant.update).not.toHaveBeenCalled();
    expect(tx.subscriptionPayment.update).not.toHaveBeenCalled();
  });

  it('marca el intento como fallido en SALE_REJECTED', async () => {
    const { service, master } = buildService();
    const { raw, signature } = signed({
      type: 'SALE_REJECTED',
      subject: 'BOLD-TX-2',
      data: { metadata: { reference: 'sub_ref_1' } },
    });

    await service.handleBoldWebhook(raw, signature);

    expect(master.subscriptionPayment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'payment-1' },
        data: expect.objectContaining({ status: 'FAILED', providerTransactionId: 'BOLD-TX-2' }),
      }),
    );
  });

  it('en sandbox acepta el webhook sin firma', async () => {
    const { master } = buildService();
    const sandboxConfig = {
      get: jest.fn((key: string) => {
        if (key === 'SUBSCRIPTION_BOLD_SANDBOX') return 'true';
        if (key === 'SUBSCRIPTION_BOLD_SECRET_KEY') return SECRET;
        return undefined;
      }),
    };
    const sandboxService = new SubscriptionService(
      master as never,
      sandboxConfig as never,
      { invalidate: jest.fn() } as never,
    );
    const { raw } = signed({
      type: 'SALE_APPROVED',
      data: { metadata: { reference: 'sub_ref_1' } },
    });

    await expect(sandboxService.handleBoldWebhook(raw, undefined)).resolves.toEqual({
      received: true,
    });
  });

  it('rechaza una firma inválida', async () => {
    const { service, master } = buildService();
    const { raw } = signed({
      type: 'SALE_APPROVED',
      data: { metadata: { reference: 'sub_ref_1' } },
    });

    await expect(service.handleBoldWebhook(raw, 'deadbeef')).rejects.toThrow('Invalid Bold signature');
    expect(master.subscriptionPayment.findUnique).not.toHaveBeenCalled();
  });

  it('ignora referencias desconocidas sin romper el webhook', async () => {
    const { service, master } = buildService();
    master.subscriptionPayment.findUnique.mockResolvedValue(null);
    const { raw, signature } = signed({
      type: 'SALE_APPROVED',
      data: { metadata: { reference: 'sub_unknown' } },
    });

    await expect(service.handleBoldWebhook(raw, signature)).resolves.toEqual({ received: true });
    expect(master.$transaction).not.toHaveBeenCalled();
  });
});
