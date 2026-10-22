import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { EmailService } from '../../email/email.service';
import { TenantContextService } from '../../tenant/tenant-context.service';
import { TenantRegistryService } from '../../tenant/tenant-registry.service';
import { QUEUE_NAMES } from '../queue-names';

interface BulkEmailPayload {
  subject: string;
  body: string;
  recipients: string[];
  tenantSlug?: string;
}

@Processor(QUEUE_NAMES.BULK_EMAIL)
@Injectable()
export class BulkEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(BulkEmailProcessor.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly registry: TenantRegistryService,
    private readonly context: TenantContextService,
  ) {
    super();
  }

  async process(job: Job<BulkEmailPayload>): Promise<void> {
    const tenant =
      (await this.registry.resolve({ slug: job.data.tenantSlug ?? null })) ?? (await this.registry.getDefault());
    if (!tenant) throw new Error('No se pudo resolver el tenant del job');

    await this.context.run(tenant, async () => {
      const { subject, body, recipients } = job.data;
      this.logger.log(`Sending bulk email to ${recipients.length} recipients (tenant ${tenant.slug})`);
      for (const recipient of recipients) {
        await this.emailService.sendGenericEmail(recipient, subject, body);
      }
    });
  }
}
