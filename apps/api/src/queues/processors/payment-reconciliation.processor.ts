import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../tenant/tenant-context.service';
import { TenantRegistryService } from '../../tenant/tenant-registry.service';
import { QUEUE_NAMES } from '../queue-names';

interface PaymentReconciliationPayload {
  olderThanHours?: number;
  tenantSlug?: string;
}

@Processor(QUEUE_NAMES.PAYMENT_RECONCILIATION)
@Injectable()
export class PaymentReconciliationProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentReconciliationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: TenantRegistryService,
    private readonly context: TenantContextService,
  ) {
    super();
  }

  async process(job: Job<PaymentReconciliationPayload>): Promise<void> {
    const tenant =
      (await this.registry.resolve({ slug: job.data.tenantSlug ?? null })) ?? (await this.registry.getDefault());
    if (!tenant) throw new Error('No se pudo resolver el tenant del job');

    await this.context.run(tenant, async () => {
      const olderThanHours = job.data.olderThanHours ?? 24;
      const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
      const stale = await this.prisma.payment.count({
        where: { status: 'PENDING', createdAt: { lt: cutoff } },
      });
      this.logger.log(
        `Found ${stale} stale pending payments older than ${olderThanHours}h (tenant ${tenant.slug})`,
      );
      // Placeholder: integrate with payment provider to verify status.
    });
  }
}
