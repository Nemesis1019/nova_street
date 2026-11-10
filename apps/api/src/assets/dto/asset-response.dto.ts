import { ApiProperty } from '@nestjs/swagger';

export class AssetResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  size!: number;

  @ApiProperty({ required: false })
  focalPointX?: number;

  @ApiProperty({ required: false })
  focalPointY?: number;

  @ApiProperty({ required: false })
  cropZoom?: number;
}
