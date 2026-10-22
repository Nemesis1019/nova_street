import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { MasterPrismaService } from '../prisma/master-prisma.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly master: MasterPrismaService,
  ) {}

  @Get()
  health() {
    return {
      status: 'ok',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('db')
  async db(@Res() res: Response) {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return res.status(HttpStatus.OK).json({ status: 'ok', db: 'connected' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({ status: 'error', db: 'disconnected', message });
    }
  }

  /** Readiness de la BD maestra (resolución de tenants). */
  @Get('platform')
  async platform(@Res() res: Response) {
    try {
      await this.master.$queryRaw`SELECT 1`;
      return res.status(HttpStatus.OK).json({ status: 'ok', master: 'connected' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return res
        .status(HttpStatus.SERVICE_UNAVAILABLE)
        .json({ status: 'error', master: 'disconnected', message });
    }
  }
}
