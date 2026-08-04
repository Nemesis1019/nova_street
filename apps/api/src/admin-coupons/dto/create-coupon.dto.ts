import { CouponAppliesTo, DiscountType } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateCouponDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsEnum(DiscountType)
  discountType!: DiscountType;

  @IsInt()
  @Min(0)
  discountValue!: number;

  @IsDateString()
  validFrom!: string;

  @IsDateString()
  @IsOptional()
  validUntil?: string;

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
  categoryId?: string;

  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  minOrderAmount?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  maxUsesPerUser?: number;

  @IsBoolean()
  @IsOptional()
  isFirstPurchaseOnly?: boolean;
}
