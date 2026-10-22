import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { TenantContextService } from '../../tenant/tenant-context.service';
import { TenantRegistryService } from '../../tenant/tenant-registry.service';
import { QUEUE_NAMES } from '../queue-names';

interface DesignPreviewPayload {
  customDesignId: string;
  tenantSlug?: string;
}

@Processor(QUEUE_NAMES.DESIGN_PREVIEW)
@Injectable()
export class DesignPreviewProcessor extends WorkerHost {
  private readonly logger = new Logger(DesignPreviewProcessor.name);

  constructor(
    private readonly registry: TenantRegistryService,
    private readonly context: TenantContextService,
  ) {
    super();
  }

  async process(job: Job<DesignPreviewPayload>): Promise<void> {
    const tenant =
      (await this.registry.resolve({ slug: job.data.tenantSlug ?? null })) ?? (await this.registry.getDefault());
    if (!tenant) throw new Error('No se pudo resolver el tenant del job');

    await this.context.run(tenant, async () => {
      this.logger.log(`Generating preview for design ${job.data.customDesignId} (tenant ${tenant.slug})`);
      // Placeholder: real implementation would render the design server-side.
    });
  }
}
