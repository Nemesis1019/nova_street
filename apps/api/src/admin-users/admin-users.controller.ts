import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permission } from '../auth/permissions';
import { AdminUsersService } from './admin-users.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { AdminRoleListResponseDto, AdminRoleResponseDto } from './dto/role-response.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { UpdateUserPermissionsDto } from './dto/update-user-permissions.dto';
import { UserOrderListResponseDto } from './dto/user-orders-response.dto';
import { AdminUserListResponseDto, AdminUserResponseDto } from './dto/user-response.dto';

@ApiTags('admin-users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Post()
  @RequirePermission(Permission.USERS_WRITE)
  @ApiOkResponse({ description: 'User created', type: AdminUserResponseDto })
  createUser(@Req() req: Request, @Body() dto: CreateUserDto) {
    return this.adminUsersService.createUser(
      {
        email: dto.email,
        password: dto.password,
        firstName: dto.firstName,
        lastName: dto.lastName,
        roleName: dto.roleName,
        permissions: dto.permissions as Permission[],
      },
      this.extractUserId(req),
    );
  }

  @Get()
  @RequirePermission(Permission.USERS_READ)
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

  @Get('roles')
  @RequirePermission(Permission.ROLES_READ)
  @ApiOkResponse({ description: 'List of roles', type: AdminRoleListResponseDto })
  findRoles() {
    return this.adminUsersService.findRoles();
  }

  @Post('roles')
  @RequirePermission(Permission.ROLES_WRITE)
  @ApiOkResponse({ description: 'Role created', type: AdminRoleResponseDto })
  createRole(@Req() req: Request, @Body() dto: CreateRoleDto) {
    return this.adminUsersService.createRole(
      {
        name: dto.name,
        description: dto.description,
        permissions: dto.permissions as Permission[],
      },
      this.extractUserId(req),
    );
  }

  @Patch('roles/:id/permissions')
  @RequirePermission(Permission.ROLES_WRITE)
  @ApiOkResponse({ description: 'Role permissions updated', type: AdminRoleResponseDto })
  updateRolePermissions(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.adminUsersService.updateRolePermissions(
      id,
      dto.permissions as Permission[],
      this.extractUserId(req),
    );
  }

  @Get(':id')
  @RequirePermission(Permission.USERS_READ)
  @ApiOkResponse({ description: 'User details', type: AdminUserResponseDto })
  findOne(@Param('id') id: string) {
    return this.adminUsersService.findOne(id);
  }

  @Get(':id/orders')
  @RequirePermission(Permission.USERS_READ)
  @ApiOkResponse({ description: "User's orders", type: UserOrderListResponseDto })
  findOrders(@Param('id') id: string) {
    return this.adminUsersService.findOrders(id);
  }

  @Patch(':id/role')
  @RequirePermission(Permission.USERS_WRITE)
  @ApiOkResponse({ description: 'User role updated', type: AdminUserResponseDto })
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.adminUsersService.updateRole(id, dto.roleName);
  }

  @Patch(':id/permissions')
  @RequirePermission(Permission.USERS_WRITE)
  @ApiOkResponse({ description: 'User permissions updated', type: AdminUserResponseDto })
  updateUserPermissions(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateUserPermissionsDto,
  ) {
    return this.adminUsersService.updateUserPermissions(
      id,
      dto.permissions as Permission[],
      this.extractUserId(req),
    );
  }

  @Patch(':id/suspend')
  @RequirePermission(Permission.USERS_WRITE)
  @ApiOkResponse({ description: 'User suspended', type: AdminUserResponseDto })
  suspend(@Req() req: Request, @Param('id') id: string, @Body() dto: SuspendUserDto) {
    return this.adminUsersService.suspend(id, dto.reason, this.extractUserId(req));
  }

  @Patch(':id/unsuspend')
  @RequirePermission(Permission.USERS_WRITE)
  @ApiOkResponse({ description: 'User unsuspended', type: AdminUserResponseDto })
  unsuspend(@Req() req: Request, @Param('id') id: string) {
    return this.adminUsersService.unsuspend(id, this.extractUserId(req));
  }

  private extractUserId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }
}
