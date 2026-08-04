import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_NAMES } from '../queue-names';

interface PaymentReconciliationPayload {
  olderThanHours?: number;
}

@Processor(QUEUE_NAMES.PAYMENT_RECONCILIATION)
@Injectable()
export class PaymentReconciliationProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentReconciliationProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<PaymentReconciliationPayload>): Promise<void> {
    const olderThanHours = job.data.olderThanHours ?? 24;
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const stale = await this.prisma.payment.count({
      where: { status: 'PENDING', createdAt: { lt: cutoff } },
    });
    this.logger.log(`Found ${stale} stale pending payments older than ${olderThanHours}h`);
    // Placeholder: integrate with payment provider to verify status.
  }
}
