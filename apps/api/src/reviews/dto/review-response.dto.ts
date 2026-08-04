import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ReviewAssetResponseDto } from './review-asset-response.dto';

export class ReviewUserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;
}

export class ReviewProductResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;
}

export class ReviewResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty({ type: () => ReviewProductResponseDto })
  product!: ReviewProductResponseDto;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ type: () => ReviewUserResponseDto })
  user!: ReviewUserResponseDto;

  @ApiPropertyOptional({ format: 'uuid' })
  orderId?: string;

  @ApiProperty()
  rating!: number;

  @ApiPropertyOptional()
  comment?: string;

  @ApiProperty()
  isApproved!: boolean;

  @ApiProperty({ type: [ReviewAssetResponseDto] })
  assets!: ReviewAssetResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class ReviewListResponseDto {
  @ApiProperty({ type: [ReviewResponseDto] })
  data!: ReviewResponseDto[];

  @ApiProperty()
  meta!: { page: number; limit: number; total: number };

  @ApiProperty()
  averageRating!: number;
}
