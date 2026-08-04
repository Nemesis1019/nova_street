import { CartItemType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class AnonymousCartItemDto {
  @IsEnum(CartItemType)
  type!: CartItemType;

  @IsUUID()
  @IsOptional()
  productVariantId?: string;

  @IsUUID()
  @IsOptional()
  customDesignId?: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}
