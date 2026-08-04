import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { QUEUE_NAMES } from '../queue-names';

interface DesignPreviewPayload {
  customDesignId: string;
}

@Processor(QUEUE_NAMES.DESIGN_PREVIEW)
@Injectable()
export class DesignPreviewProcessor extends WorkerHost {
  private readonly logger = new Logger(DesignPreviewProcessor.name);

  async process(job: Job<DesignPreviewPayload>): Promise<void> {
    this.logger.log(`Generating preview for design ${job.data.customDesignId}`);
    // Placeholder: real implementation would render the design server-side.
  }
}
