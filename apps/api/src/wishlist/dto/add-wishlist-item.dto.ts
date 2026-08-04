import { IsUUID } from 'class-validator';

export class AddWishlistItemDto {
  @IsUUID()
  productVariantId!: string;
}
