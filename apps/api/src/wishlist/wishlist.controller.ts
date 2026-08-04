import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';
import { WishlistListDto } from './dto/wishlist-item.dto';
import { WishlistService } from './wishlist.service';

@ApiTags('wishlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOkResponse({ type: WishlistListDto })
  findAll(@Req() req: Request) {
    return this.wishlistService.findAll(this.extractUserId(req));
  }

  @Post()
  @ApiOkResponse({ type: WishlistListDto })
  add(@Req() req: Request, @Body() dto: AddWishlistItemDto) {
    return this.wishlistService.add(this.extractUserId(req), dto.productVariantId);
  }

  @Delete(':productVariantId')
  remove(@Req() req: Request, @Param('productVariantId') productVariantId: string) {
    return this.wishlistService.remove(this.extractUserId(req), productVariantId);
  }

  private extractUserId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }
}
