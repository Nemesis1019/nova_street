import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permission } from '../auth/permissions';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewListResponseDto, ReviewResponseDto } from './dto/review-response.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('reviews')
@Controller('products/:productId/reviews')
export class ProductReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiOkResponse({ description: 'Approved reviews for a product', type: ReviewListResponseDto })
  findByProduct(
    @Param('productId') productId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.findByProduct(productId, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Review created', type: ReviewResponseDto })
  create(
    @Req() req: Request,
    @Param('productId') productId: string,
    @Body() dto: CreateReviewDto,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.reviewsService.create(productId, userId, dto);
  }
}

@ApiTags('admin-reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @RequirePermission(Permission.REVIEWS_MODERATE)
  @ApiOkResponse({ description: 'Paginated list of reviews', type: ReviewListResponseDto })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isApproved') isApproved?: string,
    @Query('productId') productId?: string,
    @Query('search') search?: string,
  ) {
    return this.reviewsService.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      isApproved: isApproved === undefined ? undefined : isApproved === 'true',
      productId,
      search,
    });
  }

  @Patch(':id/approve')
  @RequirePermission(Permission.REVIEWS_MODERATE)
  @ApiOkResponse({ description: 'Review approved', type: ReviewResponseDto })
  approve(@Req() req: Request, @Param('id') id: string) {
    return this.reviewsService.updateApproval(id, true, this.extractUserId(req));
  }

  @Patch(':id/reject')
  @RequirePermission(Permission.REVIEWS_MODERATE)
  @ApiOkResponse({ description: 'Review rejected', type: ReviewResponseDto })
  reject(@Req() req: Request, @Param('id') id: string) {
    return this.reviewsService.updateApproval(id, false, this.extractUserId(req));
  }

  @Delete(':id')
  @RequirePermission(Permission.REVIEWS_MODERATE)
  @ApiOkResponse({ description: 'Review deleted' })
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.reviewsService.remove(id, this.extractUserId(req));
  }

  private extractUserId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }
}
