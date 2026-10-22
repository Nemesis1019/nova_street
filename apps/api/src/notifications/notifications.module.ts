import { Global, Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { SseAuthGuard } from './sse-auth.guard';

@Global()
@Module({
  imports: [UsersModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, SseAuthGuard],
  exports: [NotificationsService],
})
export class NotificationsModule {}
