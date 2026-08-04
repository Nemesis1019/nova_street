import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminProductService } from './admin-product.service';
import { AddProductImageDto } from './dto/add-product-image.dto';
import { AdminProductDetailDto, AdminProductListResponseDto, ProductResponseDto } from './dto/admin-catalog-response.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductImageResponseDto } from './dto/product-image-response.dto';
import { ReorderProductImagesDto } from './dto/reorder-product-images.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@ApiTags('admin-catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/products')
export class AdminProductController {
  constructor(private readonly adminProductService: AdminProductService) {}

  @Post()
  @ApiOkResponse({ type: ProductResponseDto })
  create(@Body() dto: CreateProductDto) {
    return this.adminProductService.create(dto);
  }

  @Get()
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
  @ApiOkResponse({ type: AdminProductDetailDto })
  findOne(@Param('id') id: string) {
    return this.adminProductService.findById(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ProductResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.adminProductService.update(id, dto);
  }

  @Patch(':id/toggle-active')
  @ApiOkResponse({ type: ProductResponseDto })
  toggleActive(@Param('id') id: string) {
    return this.adminProductService.toggleActive(id);
  }

  @Delete(':id')
  @ApiOkResponse({ type: ProductResponseDto })
  remove(@Param('id') id: string) {
    return this.adminProductService.remove(id);
  }

  @Post(':id/images')
  @ApiOkResponse({ type: ProductImageResponseDto })
  addImage(@Param('id') id: string, @Body() dto: AddProductImageDto) {
    return this.adminProductService.addImage(id, dto);
  }

  @Delete(':id/images/:imageId')
  @ApiOkResponse({ type: ProductImageResponseDto })
  removeImage(@Param('id') id: string, @Param('imageId') imageId: string) {
    return this.adminProductService.removeImage(id, imageId);
  }

  @Patch(':id/images/reorder')
  @ApiOkResponse({ type: AdminProductDetailDto })
  reorderImages(@Param('id') id: string, @Body() dto: ReorderProductImagesDto) {
    return this.adminProductService.reorderImages(id, dto);
  }
}
