import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { AuditService } from '../audit/audit.service';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permission } from '../auth/permissions';
import { AdminCategoryService } from './admin-category.service';
import { CategoryDetailDto, CategoryResponseDto } from './dto/admin-catalog-response.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('admin-catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/categories')
export class AdminCategoryController {
  constructor(
    private readonly adminCategoryService: AdminCategoryService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @RequirePermission(Permission.CATEGORIES_WRITE)
  @ApiOkResponse({ type: CategoryResponseDto })
  async create(@Req() req: Request, @Body() dto: CreateCategoryDto) {
    const userId = this.extractUserId(req);
    const created = await this.adminCategoryService.create(dto);
    await this.auditService.log({
      userId,
      action: 'CREATE_CATEGORY',
      entity: 'Category',
      entityId: created.id,
      after: this.categorySnapshot(created),
    });
    return created;
  }

  @Get()
  @RequirePermission(Permission.CATEGORIES_READ)
  @ApiOkResponse({ type: [CategoryResponseDto] })
  findAll() {
    return this.adminCategoryService.findAll();
  }

  @Get(':id')
  @RequirePermission(Permission.CATEGORIES_READ)
  @ApiOkResponse({ type: CategoryDetailDto })
  findOne(@Param('id') id: string) {
    return this.adminCategoryService.findById(id);
  }

  @Patch(':id')
  @RequirePermission(Permission.CATEGORIES_WRITE)
  @ApiOkResponse({ type: CategoryResponseDto })
  async update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    const userId = this.extractUserId(req);
    const before = await this.adminCategoryService.findById(id);
    const updated = await this.adminCategoryService.update(id, dto);
    await this.auditService.log({
      userId,
      action: 'UPDATE_CATEGORY',
      entity: 'Category',
      entityId: id,
      before: this.categorySnapshot(before),
      after: this.categorySnapshot(updated),
    });
    return updated;
  }

  @Delete(':id')
  @RequirePermission(Permission.CATEGORIES_WRITE)
  @ApiOkResponse({ type: CategoryResponseDto })
  async remove(@Req() req: Request, @Param('id') id: string) {
    const userId = this.extractUserId(req);
    const before = await this.adminCategoryService.findById(id);
    const deleted = await this.adminCategoryService.remove(id);
    await this.auditService.log({
      userId,
      action: 'DELETE_CATEGORY',
      entity: 'Category',
      entityId: id,
      before: this.categorySnapshot(before),
    });
    return deleted;
  }

  private extractUserId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }

  private categorySnapshot(category: Record<string, unknown>): Record<string, unknown> {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = category;
    return rest;
  }
}
