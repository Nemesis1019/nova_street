import { ApiProperty } from '@nestjs/swagger';

export class WishlistItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  productVariantId!: string;

  @ApiProperty()
  productName!: string;

  @ApiProperty()
  productSlug!: string;

  @ApiProperty()
  price!: number;

  @ApiProperty({ required: false })
  imageUrl?: string;

  @ApiProperty()
  createdAt!: Date;
}

export class WishlistListDto {
  @ApiProperty({ type: [WishlistItemDto] })
  data!: WishlistItemDto[];
}
