import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  Prisma,
  SubscriptionPaymentStatus,
  SubscriptionPlan,
  SubscriptionStatus,
  Tenant,
} from '@prisma/master-client';

import { MasterPrismaService } from '../prisma/master-prisma.service';
import { TenantRegistryService } from '../tenant/tenant-registry.service';
import { getCurrentTenantSlug } from '../tenant/tenant-runtime';
import {
  addDays,
  type BoldWebhookBody,
  buildBoldIntegritySignature,
  isSubscriptionPaid,
  isValidBoldWebhookSignature,
  resolveSubscriptionStatus,
  subscriptionGraceDays,
} from './subscription.utils';

export interface SubscriptionPlanView {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  periodDays: number;
  features: string[];
  isActive: boolean;
}

export interface SubscriptionBoldInfo {
  configured: boolean;
  sandbox: boolean;
}

export interface SubscriptionPaymentView {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: SubscriptionPaymentStatus;
  provider: string;
  providerTransactionId: string | null;
  paidAt: string | null;
  createdAt: string;
  planId: string | null;
  planName: string | null;
}

export interface SubscriptionOverview {
  tenant: { id: string; slug: string; name: string };
  plan: SubscriptionPlanView | null;
  plans: SubscriptionPlanView[];
  status: SubscriptionStatus;
  paid: boolean;
  paidUntil: string | null;
  graceDays: number;
  suspendedAt: string | null;
  lastPaymentAt: string | null;
  lastPaymentAmount: number | null;
  lastPaymentCurrency: string | null;
  bold: SubscriptionBoldInfo;
  payments: SubscriptionPaymentView[];
}

export interface SubscriptionSummary {
  plan: SubscriptionPlanView | null;
  status: SubscriptionStatus;
  paid: boolean;
  paidUntil: Date | null;
  graceDays: number;
  suspendedAt: Date | null;
  lastPaymentAt: Date | null;
  lastPaymentAmount: number | null;
  lastPaymentCurrency: string | null;
  bold: SubscriptionBoldInfo;
}

export interface SubscriptionButtonConfig {
  apiKey: string;
  orderId: string;
  amount: number;
  currency: string;
  integritySignature: string;
  redirectionUrl: string;
  description: string;
  sandbox: boolean;
  reference: string;
  planId: string;
  planName: string;
  periodDays: number;
}

type TenantBillingRow = Pick<
  Tenant,
  | 'id'
  | 'slug'
  | 'name'
  | 'subscriptionStatus'
  | 'subscriptionPaidUntil'
  | 'subscriptionSuspendedAt'
  | 'subscriptionLastPaymentAt'
  | 'subscriptionLastPaymentAmount'
  | 'subscriptionLastPaymentCurrency'
  | 'subscriptionPlanId'
> & {
  subscriptionPlan?: SubscriptionPlan | null;
};

function planFeatures(value: Prisma.JsonValue | null): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly master: MasterPrismaService,
    private readonly config: ConfigService,
    private readonly registry: TenantRegistryService,
  ) {}

  private parsePlan(plan: SubscriptionPlan): SubscriptionPlanView {
    return {
      id: plan.id,
      slug: plan.slug,
      name: plan.name,
      description: plan.description,
      amount: plan.amount,
      currency: plan.currency.toUpperCase(),
      periodDays: plan.periodDays,
      features: planFeatures(plan.features),
      isActive: plan.isActive,
    };
  }

  private getGraceDays(): number {
    return subscriptionGraceDays();
  }

  async listPlans(): Promise<SubscriptionPlanView[]> {
    const plans = await this.master.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { amount: 'asc' }],
    });
    return plans.map((plan) => this.parsePlan(plan));
  }

  async getDefaultPlan(): Promise<SubscriptionPlanView | null> {
    const plan = await this.master.subscriptionPlan.findFirst({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { amount: 'asc' }],
    });
    return plan ? this.parsePlan(plan) : null;
  }

  private readBoldConfig(): { apiKey: string | null; secretKey: string; sandbox: boolean } {
    const sandbox =
      (this.config.get<string>('SUBSCRIPTION_BOLD_SANDBOX') ??
        this.config.get<string>('BOLD_SANDBOX') ??
        'false')
        .trim()
        .toLowerCase() === 'true';
    const apiKey =
      this.config.get<string>('SUBSCRIPTION_BOLD_API_KEY')?.trim() ||
      this.config.get<string>('BOLD_API_KEY')?.trim() ||
      null;
    const configuredSecret =
      this.config.get<string>('SUBSCRIPTION_BOLD_SECRET_KEY')?.trim() ||
      this.config.get<string>('BOLD_SECRET_KEY')?.trim() ||
      '';

    return {
      apiKey,
      // En sandbox Bold usa secreto vacío, igual que el proveedor de órdenes.
      secretKey: sandbox ? '' : configuredSecret,
      sandbox,
    };
  }

  getBoldInfo(): SubscriptionBoldInfo {
    const { apiKey, secretKey, sandbox } = this.readBoldConfig();
    return {
      // Sin secret en producción no se puede verificar el webhook ni firmar el botón.
      configured: Boolean(apiKey) && (sandbox || Boolean(secretKey)),
      sandbox,
    };
  }

  private getAdminUrl(): string {
    const configured = this.config.get<string>('ADMIN_URL')?.trim();
    if (configured) return configured.replace(/\/+$/, '');

    const origins = (this.config.get<string>('FRONTEND_URL') ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    const adminOrigin = origins.find((origin) => /(^|:)3001$/i.test(origin)) ?? origins[1] ?? origins[0];
    return (adminOrigin ?? 'http://localhost:3001').replace(/\/+$/, '');
  }

  private effectiveStatus(tenant: TenantBillingRow, now = new Date()): SubscriptionStatus {
    return resolveSubscriptionStatus(tenant, now, this.getGraceDays());
  }

  summaryForTenant(tenant: TenantBillingRow, now = new Date()): SubscriptionSummary {
    const graceDays = this.getGraceDays();
    return {
      plan: tenant.subscriptionPlan ? this.parsePlan(tenant.subscriptionPlan) : null,
      status: this.effectiveStatus(tenant, now),
      paid: isSubscriptionPaid(tenant, now, graceDays),
      paidUntil: tenant.subscriptionPaidUntil,
      graceDays,
      suspendedAt: tenant.subscriptionSuspendedAt,
      lastPaymentAt: tenant.subscriptionLastPaymentAt,
      lastPaymentAmount: tenant.subscriptionLastPaymentAmount,
      lastPaymentCurrency: tenant.subscriptionLastPaymentCurrency,
      bold: this.getBoldInfo(),
    };
  }

  async getCurrentOverview(): Promise<SubscriptionOverview> {
    const slug = getCurrentTenantSlug();
    if (!slug) throw new BadRequestException('No se pudo resolver el cliente actual');
    return this.getOverviewBySlug(slug);
  }

  async getOverviewBySlug(slug: string): Promise<SubscriptionOverview> {
    const tenant = await this.master.tenant.findUnique({
      where: { slug },
      include: { subscriptionPlan: true },
    });
    if (!tenant) throw new NotFoundException('Cliente no encontrado');
    return this.getOverviewForTenant(tenant);
  }

  async getOverviewById(tenantId: string): Promise<SubscriptionOverview> {
    const tenant = await this.master.tenant.findUnique({
      where: { id: tenantId },
      include: { subscriptionPlan: true },
    });
    if (!tenant) throw new NotFoundException('Cliente no encontrado');
    return this.getOverviewForTenant(tenant);
  }

  async getOverviewForTenant(tenant: TenantBillingRow): Promise<SubscriptionOverview> {
    const [payments, plans] = await Promise.all([
      this.master.subscriptionPayment.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.listPlans(),
    ]);
    const summary = this.summaryForTenant(tenant);

    return {
      tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
      plan: summary.plan,
      plans,
      status: summary.status,
      paid: summary.paid,
      paidUntil: tenant.subscriptionPaidUntil?.toISOString() ?? null,
      graceDays: summary.graceDays,
      suspendedAt: tenant.subscriptionSuspendedAt?.toISOString() ?? null,
      lastPaymentAt: tenant.subscriptionLastPaymentAt?.toISOString() ?? null,
      lastPaymentAmount: tenant.subscriptionLastPaymentAmount,
      lastPaymentCurrency: tenant.subscriptionLastPaymentCurrency,
      bold: summary.bold,
      payments: payments.map((payment) => ({
        id: payment.id,
        reference: payment.reference,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        provider: payment.provider,
        providerTransactionId: payment.providerTransactionId,
        paidAt: payment.paidAt?.toISOString() ?? null,
        createdAt: payment.createdAt.toISOString(),
        planId: payment.planId,
        planName: payment.planName,
      })),
    };
  }

  /** Crea (o reutiliza) un intento de pago y devuelve la config del botón Bold. */
  async createCheckoutForCurrentTenant(planId?: string): Promise<SubscriptionButtonConfig> {
    const slug = getCurrentTenantSlug();
    if (!slug) throw new BadRequestException('No se pudo resolver el cliente actual');

    const tenant = await this.master.tenant.findUnique({
      where: { slug },
      include: { subscriptionPlan: true },
    });
    if (!tenant) throw new NotFoundException('Cliente no encontrado');

    return this.createCheckoutForTenant(tenant, planId);
  }

  async createCheckoutForTenantId(
    tenantId: string,
    planId?: string,
  ): Promise<SubscriptionButtonConfig> {
    const tenant = await this.master.tenant.findUnique({
      where: { id: tenantId },
      include: { subscriptionPlan: true },
    });
    if (!tenant) throw new NotFoundException('Cliente no encontrado');
    return this.createCheckoutForTenant(tenant, planId);
  }

  private async resolvePlan(planId?: string): Promise<SubscriptionPlanView> {
    if (planId) {
      const plan = await this.master.subscriptionPlan.findFirst({
        where: { id: planId, isActive: true },
      });
      if (!plan) throw new BadRequestException('El plan seleccionado no está disponible');
      return this.parsePlan(plan);
    }

    const plan = await this.getDefaultPlan();
    if (!plan) throw new ServiceUnavailableException('No hay planes de suscripción activos');
    return plan;
  }

  private async createCheckoutForTenant(
    tenant: TenantBillingRow,
    requestedPlanId?: string,
  ): Promise<SubscriptionButtonConfig> {
    const bold = this.readBoldConfig();
    if (!bold.apiKey || (!bold.secretKey && !bold.sandbox)) {
      throw new ServiceUnavailableException(
        'Bold no está configurado para la suscripción. Configurá SUBSCRIPTION_BOLD_API_KEY y SUBSCRIPTION_BOLD_SECRET_KEY en la API.',
      );
    }

    const plan = await this.resolvePlan(requestedPlanId ?? tenant.subscriptionPlanId ?? undefined);
    const secretKey = bold.secretKey;
    const recent = new Date(Date.now() - 30 * 60_000);

    // Reutiliza el intento pendiente reciente para no crear filas en cada refresh.
    let payment = await this.master.subscriptionPayment.findFirst({
      where: {
        tenantId: tenant.id,
        status: 'PENDING',
        planId: plan.id,
        amount: plan.amount,
        currency: plan.currency,
        createdAt: { gte: recent },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      payment = await this.master.subscriptionPayment.create({
        data: {
          tenantId: tenant.id,
          reference: `sub_${tenant.id.slice(0, 8)}_${randomUUID()}`,
          amount: plan.amount,
          currency: plan.currency,
          periodDays: plan.periodDays,
          provider: 'bold',
          status: 'PENDING',
          planId: plan.id,
          planName: plan.name,
        },
      });
    }

    const description = `Suscripción ${plan.name} · ${tenant.name}`.slice(0, 100);
    return {
      apiKey: bold.apiKey,
      orderId: payment.reference,
      amount: payment.amount,
      currency: payment.currency,
      integritySignature: buildBoldIntegritySignature(
        payment.reference,
        payment.amount,
        payment.currency,
        secretKey,
      ),
      redirectionUrl: `${this.getAdminUrl()}/subscription?subscription=return&reference=${encodeURIComponent(payment.reference)}`,
      description,
      sandbox: bold.sandbox,
      reference: payment.reference,
      planId: plan.id,
      planName: plan.name,
      periodDays: payment.periodDays,
    };
  }

  async setPlanForTenant(tenantId: string, planId: string): Promise<SubscriptionOverview> {
    const plan = await this.master.subscriptionPlan.findFirst({
      where: { id: planId, isActive: true },
    });
    if (!plan) throw new BadRequestException('El plan seleccionado no está disponible');

    const tenant = await this.master.tenant.findUnique({
      where: { id: tenantId },
      include: { subscriptionPlan: true },
    });
    if (!tenant) throw new NotFoundException('Cliente no encontrado');

    await this.master.tenant.update({
      where: { id: tenant.id },
      data: { subscriptionPlanId: plan.id },
    });
    this.registry.invalidate(tenant.slug);
    return this.getOverviewById(tenant.id);
  }

  async suspendTenant(tenantId: string): Promise<SubscriptionOverview> {
    const tenant = await this.master.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Cliente no encontrado');

    await this.master.tenant.update({
      where: { id: tenant.id },
      data: {
        subscriptionStatus: 'SUSPENDED',
        subscriptionSuspendedAt: new Date(),
      },
    });
    this.registry.invalidate(tenant.slug);
    return this.getOverviewById(tenant.id);
  }

  async reactivateTenant(tenantId: string): Promise<SubscriptionOverview> {
    const tenant = await this.master.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Cliente no encontrado');

    const now = new Date();

    // La suspensión automática por impago no se puede saltar desde el panel:
    // el cliente debe pagar. El botón Reactivar sólo limpia una suspensión manual.
    if (tenant.subscriptionStatus !== 'SUSPENDED') {
      if (resolveSubscriptionStatus(tenant, now, this.getGraceDays()) === 'SUSPENDED') {
        throw new BadRequestException(
          'La tienda está suspendida por falta de pago. El cliente debe regularizar la suscripción.',
        );
      }
      throw new BadRequestException('La suscripción no está suspendida');
    }
    if (tenant.subscriptionPaidUntil && tenant.subscriptionPaidUntil.getTime() <= now.getTime()) {
      throw new BadRequestException(
        'La suscripción debe regularizarse con un pago antes de reactivarla.',
      );
    }

    const nextStatus: SubscriptionStatus = tenant.subscriptionPaidUntil &&
      tenant.subscriptionPaidUntil.getTime() > now.getTime()
      ? 'ACTIVE'
      : 'TRIAL';

    await this.master.tenant.update({
      where: { id: tenant.id },
      data: {
        subscriptionStatus: nextStatus,
        subscriptionSuspendedAt: null,
      },
    });
    this.registry.invalidate(tenant.slug);
    return this.getOverviewById(tenant.id);
  }

  /**
   * Webhook público de Bold para la suscripción SaaS. Se valida con la firma
   * del secret de plataforma y la referencia del intento de pago. Es idempotente.
   */
  async handleBoldWebhook(
    payload: Buffer | string,
    signature: string | undefined,
  ): Promise<{ received: true }> {
    const raw = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
    const bold = this.readBoldConfig();

    // En producción no se aceptan webhooks sin verificación: permitiría que
    // cualquiera marque como pagada una suscripción con una referencia conocida.
    if (!bold.secretKey && !bold.sandbox && this.config.get<string>('NODE_ENV') === 'production') {
      this.logger.error('Webhook de suscripción rechazado: falta SUBSCRIPTION_BOLD_SECRET_KEY');
      throw new ServiceUnavailableException('Bold subscription webhook is not configured');
    }

    if (!isValidBoldWebhookSignature(raw, signature, bold.secretKey)) {
      throw new BadRequestException('Invalid Bold signature');
    }
    if (!bold.secretKey) {
      this.logger.warn('Webhook de suscripción Bold sin firma (sandbox o desarrollo sin secret)');
    }

    let event: BoldWebhookBody;
    try {
      event = JSON.parse(raw.toString('utf8')) as BoldWebhookBody;
    } catch {
      throw new BadRequestException('Invalid JSON payload');
    }

    const reference = event.data?.metadata?.reference;
    if (!reference) {
      this.logger.warn(`Webhook Bold sin metadata.reference (tipo: ${event.type ?? 'desconocido'})`);
      return { received: true };
    }

    const payment = await this.master.subscriptionPayment.findUnique({ where: { reference } });
    if (!payment) {
      this.logger.warn(`Webhook Bold de suscripción con referencia desconocida: ${reference}`);
      return { received: true };
    }

    const providerTransactionId = event.data?.payment_id ?? event.subject ?? null;
    const metadata = event as unknown as Prisma.InputJsonValue;

    if (event.type === 'SALE_APPROVED') {
      await this.markPaymentPaid(payment.id, providerTransactionId, metadata);
      return { received: true };
    }

    if (event.type === 'SALE_REJECTED') {
      if (payment.status !== 'PAID') {
        await this.master.subscriptionPayment.update({
          where: { id: payment.id },
          data: {
            status: 'FAILED',
            providerTransactionId,
            metadata,
          },
        });
      }
      return { received: true };
    }

    return { received: true };
  }

  private async markPaymentPaid(
    paymentId: string,
    providerTransactionId: string | null,
    metadata: Prisma.InputJsonValue,
  ): Promise<void> {
    let paidTenantSlug: string | null = null;

    await this.master.$transaction(async (tx) => {
      const payment = await tx.subscriptionPayment.findUnique({ where: { id: paymentId } });
      if (!payment || payment.status === 'PAID') return;

      const tenant = await tx.tenant.findUnique({ where: { id: payment.tenantId } });
      if (!tenant) return;

      const paidAt = new Date();

      // Claim atómico: si Bold reintenta en paralelo, sólo una transacción
      // puede pasar de PENDING/FAILED a PAID y extender el período.
      const claimed = await tx.subscriptionPayment.updateMany({
        where: { id: payment.id, status: { not: 'PAID' } },
        data: {
          status: 'PAID',
          providerTransactionId,
          paidAt,
          metadata,
        },
      });
      if (claimed.count === 0) return;

      const base = tenant.subscriptionPaidUntil && tenant.subscriptionPaidUntil > paidAt
        ? tenant.subscriptionPaidUntil
        : paidAt;
      const paidUntil = addDays(base, payment.periodDays);

      await tx.tenant.update({
        where: { id: tenant.id },
        data: {
          subscriptionStatus: 'ACTIVE',
          subscriptionPaidUntil: paidUntil,
          subscriptionSuspendedAt: null,
          subscriptionLastPaymentAt: paidAt,
          subscriptionLastPaymentAmount: payment.amount,
          subscriptionLastPaymentCurrency: payment.currency,
          ...(payment.planId ? { subscriptionPlanId: payment.planId } : {}),
        },
      });
      paidTenantSlug = tenant.slug;
    });

    if (paidTenantSlug) this.registry.invalidate(paidTenantSlug);
  }
}
