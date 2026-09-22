import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permission } from '../auth/permissions';
import { EnqueueJobDto } from './dto/enqueue-job.dto';
import { QueuesService } from './queues.service';

@ApiTags('admin-queues')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/queues')
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  @Post('jobs')
  @RequirePermission(Permission.QUEUES_WRITE)
  enqueue(@Body() dto: EnqueueJobDto, @Req() req: Request) {
    void this.logAudit(req, dto);
    return this.queuesService.enqueue(dto.type, dto.payload);
  }

  private logAudit(req: Request, dto: EnqueueJobDto) {
    const userId = (req.user as { userId: string } | undefined)?.userId;
    // Audit log could be added here; kept simple to avoid circular dependency.
    return { userId, type: dto.type };
  }
}
