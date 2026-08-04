import { ApiProperty } from '@nestjs/swagger';

export class ReviewAssetResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  thumbnailUrl!: string;

  @ApiProperty()
  sortOrder!: number;
}
