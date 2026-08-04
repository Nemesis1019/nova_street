import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminMetricsResponseDto } from './dto/metrics-response.dto';
import { AdminTrendsResponseDto } from './dto/trends-response.dto';

@ApiTags('admin-dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('metrics')
  @ApiOkResponse({ description: 'Dashboard metrics', type: AdminMetricsResponseDto })
  getMetrics() {
    return this.adminDashboardService.getMetrics();
  }

  @Get('trends')
  @ApiOkResponse({ description: 'Daily trends for the last 7 days', type: AdminTrendsResponseDto })
  getTrends() {
    return this.adminDashboardService.getTrends();
  }
}
