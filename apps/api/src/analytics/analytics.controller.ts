import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permission } from '../auth/permissions';
import { AnalyticsService } from './analytics.service';
import { ConversionReportDto } from './dto/conversion-report.dto';
import { SalesReportDto } from './dto/sales-report.dto';
import { TopProductsReportDto } from './dto/top-products-report.dto';

@ApiTags('admin-analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('sales')
  @RequirePermission(Permission.ANALYTICS_READ)
  @ApiOkResponse({ type: SalesReportDto })
  sales(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const range = this.parseRange(from, to);
    return this.analyticsService.salesReport(range);
  }

  @Get('top-products')
  @RequirePermission(Permission.ANALYTICS_READ)
  @ApiOkResponse({ type: TopProductsReportDto })
  topProducts(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    const range = this.parseRange(from, to);
    return this.analyticsService.topProducts(range, limit ? Math.min(Number(limit), 50) : 10);
  }

  @Get('conversion')
  @RequirePermission(Permission.ANALYTICS_READ)
  @ApiOkResponse({ type: ConversionReportDto })
  conversion(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const range = this.parseRange(from, to);
    return this.analyticsService.conversionReport(range);
  }

  private parseRange(from?: string, to?: string): { from: Date; to: Date } {
    const now = new Date();
    const fromDate = from ? new Date(from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : now;
    return { from: fromDate, to: toDate };
  }
}
