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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permission } from '../auth/permissions';
import { AdminCouponService } from './admin-coupon.service';
import { CouponListResponseDto, CouponResponseDto } from './dto/coupon-response.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@ApiTags('admin-coupons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/coupons')
export class AdminCouponController {
  constructor(private readonly adminCouponService: AdminCouponService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(Permission.COUPONS_WRITE)
  @ApiOkResponse({ type: CouponResponseDto })
  create(@Body() dto: CreateCouponDto) {
    return this.adminCouponService.create(dto);
  }

  @Get()
  @RequirePermission(Permission.COUPONS_READ)
  @ApiOkResponse({ type: CouponListResponseDto })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.adminCouponService.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
  }

  @Get(':id')
  @RequirePermission(Permission.COUPONS_READ)
  @ApiOkResponse({ type: CouponResponseDto })
  findOne(@Param('id') id: string) {
    return this.adminCouponService.findById(id);
  }

  @Patch(':id')
  @RequirePermission(Permission.COUPONS_WRITE)
  @ApiOkResponse({ type: CouponResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.adminCouponService.update(id, dto);
  }

  @Patch(':id/toggle-active')
  @RequirePermission(Permission.COUPONS_WRITE)
  @ApiOkResponse({ type: CouponResponseDto })
  toggleActive(@Param('id') id: string) {
    return this.adminCouponService.toggleActive(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permission.COUPONS_WRITE)
  remove(@Param('id') id: string) {
    return this.adminCouponService.remove(id);
  }
}
