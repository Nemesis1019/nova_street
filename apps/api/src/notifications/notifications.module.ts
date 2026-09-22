import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { UsersModule } from '../users/users.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { SseAuthGuard } from './sse-auth.guard';

@Global()
@Module({
  imports: [JwtModule, UsersModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, SseAuthGuard],
  exports: [NotificationsService],
})
export class NotificationsModule {}
