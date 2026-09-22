import { Controller, Sse, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { NotificationsService } from './notifications.service';
import { SseAuthGuard } from './sse-auth.guard';

@ApiTags('admin-notifications')
@ApiBearerAuth()
@UseGuards(SseAuthGuard, RolesGuard)
@Controller('admin/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Sse('stream')
  @Roles('ADMIN')
  stream() {
    return this.notificationsService.getStream();
  }
}
