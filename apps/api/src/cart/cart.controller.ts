import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { CartResponseDto } from './dto/cart-response.dto';
import { MergeCartDto } from './dto/merge-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@ApiTags('cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOkResponse({ type: CartResponseDto })
  getCart(@Req() req: Request) {
    const userId = this.extractUserId(req);
    return this.cartService.getCart(userId);
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: CartResponseDto })
  addItem(@Req() req: Request, @Body() dto: AddCartItemDto) {
    const userId = this.extractUserId(req);
    return this.cartService.addItem(userId, dto);
  }

  @Patch('items/:itemId')
  @ApiOkResponse({ type: CartResponseDto })
  updateItem(
    @Req() req: Request,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const userId = this.extractUserId(req);
    return this.cartService.updateItem(userId, itemId, dto);
  }

  @Delete('items/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: CartResponseDto })
  removeItem(@Req() req: Request, @Param('itemId') itemId: string) {
    const userId = this.extractUserId(req);
    return this.cartService.removeItem(userId, itemId);
  }

  @Post('merge')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: CartResponseDto })
  mergeCart(@Req() req: Request, @Body() dto: MergeCartDto) {
    const userId = this.extractUserId(req);
    return this.cartService.mergeCart(userId, dto);
  }

  private extractUserId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }
}
