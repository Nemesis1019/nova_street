import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { AuditService } from '../audit/audit.service';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permission } from '../auth/permissions';
import { AdminProductService } from './admin-product.service';
import { AddProductImageDto } from './dto/add-product-image.dto';
import { AdminProductDetailDto, AdminProductListResponseDto, ProductResponseDto } from './dto/admin-catalog-response.dto';
import { BulkProductActionDto } from './dto/bulk-product-action.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ImportProductDto } from './dto/import-product.dto';
import { ProductImageResponseDto } from './dto/product-image-response.dto';
import { ReorderProductImagesDto } from './dto/reorder-product-images.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@ApiTags('admin-catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/products')
export class AdminProductController {
  constructor(
    private readonly adminProductService: AdminProductService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @RequirePermission(Permission.PRODUCTS_WRITE)
  @ApiOkResponse({ type: ProductResponseDto })
  async create(@Req() req: Request, @Body() dto: CreateProductDto) {
    const userId = this.extractUserId(req);
    const created = await this.adminProductService.create(dto);
    await this.auditService.log({
      userId,
      action: 'CREATE_PRODUCT',
      entity: 'Product',
      entityId: created.id,
      after: this.productSnapshot(created),
    });
    return created;
  }

  @Get()
  @RequirePermission(Permission.PRODUCTS_READ)
  @ApiOkResponse({ type: AdminProductListResponseDto })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminProductService.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      search,
    });
  }

  @Get(':id')
  @RequirePermission(Permission.PRODUCTS_READ)
  @ApiOkResponse({ type: AdminProductDetailDto })
  findOne(@Param('id') id: string) {
    return this.adminProductService.findById(id);
  }

  @Patch(':id')
  @RequirePermission(Permission.PRODUCTS_WRITE)
  @ApiOkResponse({ type: ProductResponseDto })
  async update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    const userId = this.extractUserId(req);
    const before = await this.adminProductService.findById(id);
    const updated = await this.adminProductService.update(id, dto);
    await this.auditService.log({
      userId,
      action: 'UPDATE_PRODUCT',
      entity: 'Product',
      entityId: id,
      before: this.productSnapshot(before),
      after: this.productSnapshot(updated),
    });
    return updated;
  }

  @Patch(':id/toggle-active')
  @RequirePermission(Permission.PRODUCTS_WRITE)
  @ApiOkResponse({ type: ProductResponseDto })
  async toggleActive(@Req() req: Request, @Param('id') id: string) {
    const userId = this.extractUserId(req);
    const before = await this.adminProductService.findById(id);
    const updated = await this.adminProductService.toggleActive(id);
    await this.auditService.log({
      userId,
      action: 'TOGGLE_PRODUCT_ACTIVE',
      entity: 'Product',
      entityId: id,
      before: { isActive: before.isActive },
      after: { isActive: updated.isActive },
    });
    return updated;
  }

  @Delete(':id')
  @RequirePermission(Permission.PRODUCTS_WRITE)
  @ApiOkResponse({ type: ProductResponseDto })
  async remove(@Req() req: Request, @Param('id') id: string) {
    const userId = this.extractUserId(req);
    const before = await this.adminProductService.findById(id);
    const deleted = await this.adminProductService.remove(id);
    await this.auditService.log({
      userId,
      action: 'DELETE_PRODUCT',
      entity: 'Product',
      entityId: id,
      before: this.productSnapshot(before),
    });
    return deleted;
  }

  @Post('bulk')
  @RequirePermission(Permission.PRODUCTS_WRITE)
  @ApiOkResponse({ type: Object })
  bulk(@Req() req: Request, @Body() dto: BulkProductActionDto) {
    const userId = this.extractUserId(req);
    return this.adminProductService.bulk(dto.action, dto.ids, userId);
  }

  @Post('import')
  @RequirePermission(Permission.PRODUCTS_WRITE)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: Object })
  importCsv(@Req() req: Request, @UploadedFile() file: Express.Multer.File, @Body() _dto: ImportProductDto) {
    const userId = this.extractUserId(req);
    return this.adminProductService.importFromCsv(file.buffer, userId);
  }

  @Post(':id/images')
  @RequirePermission(Permission.PRODUCTS_WRITE)
  @ApiOkResponse({ type: ProductImageResponseDto })
  addImage(@Param('id') id: string, @Body() dto: AddProductImageDto) {
    return this.adminProductService.addImage(id, dto);
  }

  @Delete(':id/images/:imageId')
  @RequirePermission(Permission.PRODUCTS_WRITE)
  @ApiOkResponse({ type: ProductImageResponseDto })
  removeImage(@Param('id') id: string, @Param('imageId') imageId: string) {
    return this.adminProductService.removeImage(id, imageId);
  }

  @Patch(':id/images/reorder')
  @RequirePermission(Permission.PRODUCTS_WRITE)
  @ApiOkResponse({ type: AdminProductDetailDto })
  reorderImages(@Param('id') id: string, @Body() dto: ReorderProductImagesDto) {
    return this.adminProductService.reorderImages(id, dto);
  }

  private extractUserId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }

  private productSnapshot(product: Record<string, unknown>): Record<string, unknown> {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = product;
    return rest;
  }
}
