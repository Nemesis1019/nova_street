import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { EmailService } from '../../email/email.service';
import { QUEUE_NAMES } from '../queue-names';

interface BulkEmailPayload {
  subject: string;
  body: string;
  recipients: string[];
}

@Processor(QUEUE_NAMES.BULK_EMAIL)
@Injectable()
export class BulkEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(BulkEmailProcessor.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<BulkEmailPayload>): Promise<void> {
    const { subject, body, recipients } = job.data;
    this.logger.log(`Sending bulk email to ${recipients.length} recipients`);
    for (const recipient of recipients) {
      await this.emailService.sendGenericEmail(recipient, subject, body);
    }
  }
}
