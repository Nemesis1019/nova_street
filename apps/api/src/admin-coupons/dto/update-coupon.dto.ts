import { CouponAppliesTo, DiscountType } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class UpdateCouponDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsEnum(DiscountType)
  @IsOptional()
  discountType?: DiscountType;

  @IsInt()
  @Min(0)
  @IsOptional()
  discountValue?: number;

  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @IsDateString()
  @IsOptional()
  validUntil?: string | null;

  @IsInt()
  @Min(0)
  @IsOptional()
  maxUses?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsEnum(CouponAppliesTo)
  @IsOptional()
  appliesTo?: CouponAppliesTo;

  @IsUUID()
  @IsOptional()
  categoryId?: string | null;

  @IsUUID()
  @IsOptional()
  productId?: string | null;

  @IsInt()
  @Min(0)
  @IsOptional()
  minOrderAmount?: number | null;

  @IsInt()
  @Min(0)
  @IsOptional()
  maxUsesPerUser?: number | null;

  @IsBoolean()
  @IsOptional()
  isFirstPurchaseOnly?: boolean;
}
