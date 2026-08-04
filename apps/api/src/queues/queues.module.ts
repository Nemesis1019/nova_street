import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { EmailModule } from '../email/email.module';
import { BulkEmailProcessor } from './processors/bulk-email.processor';
import { DesignPreviewProcessor } from './processors/design-preview.processor';
import { PaymentReconciliationProcessor } from './processors/payment-reconciliation.processor';
import { QUEUE_NAMES } from './queue-names';
import { QueuesController } from './queues.controller';
import { QueuesService } from './queues.service';

@Module({
  imports: [
    EmailModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('REDIS_URL') ?? 'redis://localhost:6379',
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.BULK_EMAIL },
      { name: QUEUE_NAMES.DESIGN_PREVIEW },
      { name: QUEUE_NAMES.PAYMENT_RECONCILIATION },
    ),
  ],
  controllers: [QueuesController],
  providers: [QueuesService, BulkEmailProcessor, DesignPreviewProcessor, PaymentReconciliationProcessor],
  exports: [QueuesService],
})
export class QueuesModule {}
