import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

import { QueueJobType } from './dto/enqueue-job.dto';
import { QUEUE_NAMES } from './queue-names';

@Injectable()
export class QueuesService {
  constructor(
    @InjectQueue(QUEUE_NAMES.BULK_EMAIL) private readonly bulkEmailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.DESIGN_PREVIEW) private readonly designPreviewQueue: Queue,
    @InjectQueue(QUEUE_NAMES.PAYMENT_RECONCILIATION) private readonly paymentReconciliationQueue: Queue,
  ) {}

  async enqueue(type: QueueJobType, payload: Record<string, unknown>) {
    const queue = this.resolveQueue(type);
    const job = await queue.add(type, payload);
    return { jobId: job.id };
  }

  private resolveQueue(type: QueueJobType): Queue {
    switch (type) {
      case QueueJobType.SEND_BULK_EMAIL:
        return this.bulkEmailQueue;
      case QueueJobType.GENERATE_DESIGN_PREVIEW:
        return this.designPreviewQueue;
      case QueueJobType.RECONCILE_PAYMENTS:
        return this.paymentReconciliationQueue;
      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  }
}
