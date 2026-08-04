import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminProductVariantService } from './admin-product-variant.service';
import { ProductVariantResponseDto } from './dto/admin-catalog-response.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';

@ApiTags('admin-catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/products/:id/variants')
export class AdminProductVariantController {
  constructor(private readonly adminProductVariantService: AdminProductVariantService) {}

  @Post()
  @ApiOkResponse({ type: ProductVariantResponseDto })
  create(@Param('id') productId: string, @Body() dto: CreateProductVariantDto) {
    return this.adminProductVariantService.create(productId, dto);
  }

  @Patch(':variantId')
  @ApiOkResponse({ type: ProductVariantResponseDto })
  update(
    @Param('id') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateProductVariantDto,
  ) {
    return this.adminProductVariantService.update(productId, variantId, dto);
  }

  @Delete(':variantId')
  @ApiOkResponse({ type: ProductVariantResponseDto })
  remove(@Param('id') productId: string, @Param('variantId') variantId: string) {
    return this.adminProductVariantService.remove(productId, variantId);
  }
}
