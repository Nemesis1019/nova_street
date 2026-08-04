import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EnqueueJobDto } from './dto/enqueue-job.dto';
import { QueuesService } from './queues.service';

@ApiTags('admin-queues')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/queues')
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  @Post('jobs')
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
