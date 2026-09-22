import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permission } from '../auth/permissions';
import { AdminProductVariantService } from './admin-product-variant.service';
import { ProductVariantResponseDto } from './dto/admin-catalog-response.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';

@ApiTags('admin-catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/products/:id/variants')
export class AdminProductVariantController {
  constructor(private readonly adminProductVariantService: AdminProductVariantService) {}

  @Post()
  @RequirePermission(Permission.VARIANTS_WRITE)
  @ApiOkResponse({ type: ProductVariantResponseDto })
  create(@Param('id') productId: string, @Body() dto: CreateProductVariantDto) {
    return this.adminProductVariantService.create(productId, dto);
  }

  @Patch(':variantId')
  @RequirePermission(Permission.VARIANTS_WRITE)
  @ApiOkResponse({ type: ProductVariantResponseDto })
  update(
    @Param('id') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateProductVariantDto,
  ) {
    return this.adminProductVariantService.update(productId, variantId, dto);
  }

  @Delete(':variantId')
  @RequirePermission(Permission.VARIANTS_WRITE)
  @ApiOkResponse({ type: ProductVariantResponseDto })
  remove(@Param('id') productId: string, @Param('variantId') variantId: string) {
    return this.adminProductVariantService.remove(productId, variantId);
  }
}
