import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminUsersService } from './admin-users.service';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UserOrderListResponseDto } from './dto/user-orders-response.dto';
import { AdminUserListResponseDto, AdminUserResponseDto } from './dto/user-response.dto';

@ApiTags('admin-users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @ApiOkResponse({ description: 'Paginated list of users', type: AdminUserListResponseDto })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    return this.adminUsersService.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      search,
      role,
    });
  }

  @Get(':id')
  @ApiOkResponse({ description: 'User details', type: AdminUserResponseDto })
  findOne(@Param('id') id: string) {
    return this.adminUsersService.findOne(id);
  }

  @Get(':id/orders')
  @ApiOkResponse({ description: "User's orders", type: UserOrderListResponseDto })
  findOrders(@Param('id') id: string) {
    return this.adminUsersService.findOrders(id);
  }

  @Patch(':id/role')
  @ApiOkResponse({ description: 'User role updated', type: AdminUserResponseDto })
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.adminUsersService.updateRole(id, dto.roleName);
  }

  @Patch(':id/suspend')
  @ApiOkResponse({ description: 'User suspended', type: AdminUserResponseDto })
  suspend(@Req() req: Request, @Param('id') id: string, @Body() dto: SuspendUserDto) {
    return this.adminUsersService.suspend(id, dto.reason, this.extractUserId(req));
  }

  @Patch(':id/unsuspend')
  @ApiOkResponse({ description: 'User unsuspended', type: AdminUserResponseDto })
  unsuspend(@Req() req: Request, @Param('id') id: string) {
    return this.adminUsersService.unsuspend(id, this.extractUserId(req));
  }

  private extractUserId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }
}
