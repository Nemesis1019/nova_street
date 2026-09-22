import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permission } from '../auth/permissions';
import { AdminSearchService } from './admin-search.service';

class SearchResultDto {
  id!: string;
  title!: string;
  url!: string;
}

class SearchResponseDto {
  products!: SearchResultDto[];
  orders!: SearchResultDto[];
  users!: SearchResultDto[];
  pages!: SearchResultDto[];
}

@ApiTags('admin-search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/search')
export class AdminSearchController {
  constructor(private readonly adminSearchService: AdminSearchService) {}

  @Get()
  @RequirePermission(Permission.DASHBOARD_READ)
  @ApiOkResponse({ type: SearchResponseDto })
  async search(@Query('q') query: string) {
    return this.adminSearchService.search(query ?? '');
  }
}
