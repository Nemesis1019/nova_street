import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AssetPurpose, StockMode } from '@prisma/client';
import { Request } from 'express';

import { AssetsService } from '../assets/assets.service';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permission } from '../auth/permissions';
import { PrismaService } from '../prisma/prisma.service';
import { AdminStockService } from './admin-stock.service';
import { AddStockDto } from './dto/add-stock.dto';
import { InventoryListResponseDto, ProductVariantResponseDto } from './dto/admin-catalog-response.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { UpdateStockModeDto } from './dto/update-stock-mode.dto';

@ApiTags('admin-stock')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminStockController {
  constructor(
    private readonly adminStockService: AdminStockService,
    private readonly assetsService: AssetsService,
    private readonly prisma: PrismaService,
  ) {}

  @Patch('variants/:id/stock-mode')
  @RequirePermission(Permission.STOCK_WRITE)
  @ApiOkResponse({ type: ProductVariantResponseDto })
  updateStockMode(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateStockModeDto,
  ) {
    const adminUserId = this.extractUserId(req);
    return this.adminStockService.updateStockMode(id, dto.stockMode, adminUserId);
  }

  @Patch('variants/:id/inventory')
  @RequirePermission(Permission.STOCK_WRITE)
  @ApiOkResponse({ type: Object })
  updateInventory(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateInventoryDto,
  ) {
    const adminUserId = this.extractUserId(req);
    return this.adminStockService.updateInventory(id, dto.quantity, adminUserId);
  }

  @Post('variants/:id/add-stock')
  @RequirePermission(Permission.STOCK_WRITE)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        quantity: { type: 'integer' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiCreatedResponse({ type: Object })
  @UseInterceptors(FileInterceptor('image'))
  async addStock(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: AddStockDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const adminUserId = this.extractUserId(req);
    const inventory = await this.adminStockService.addStock(id, dto.quantity, adminUserId);

    let asset: { id: string; url: string; mimeType: string; size: number } | undefined;
    if (file) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id },
        select: { productId: true },
      });

      asset = await this.assetsService.upload(
        adminUserId,
        {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          buffer: file.buffer,
        },
        AssetPurpose.CATALOG_IMAGE,
        id,
      );

      await this.prisma.productImage.create({
        data: {
          productId: variant?.productId ?? null,
          productVariantId: id,
          assetId: asset.id,
          sortOrder: 0,
        },
      });
    }

    return { ...inventory, asset };
  }

  @Get('inventory')
  @RequirePermission(Permission.STOCK_READ)
  @ApiOkResponse({ type: InventoryListResponseDto })
  findInventory(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('stockMode') stockMode?: StockMode,
  ) {
    return this.adminStockService.findInventory({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      stockMode,
    });
  }

  private extractUserId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }
}
