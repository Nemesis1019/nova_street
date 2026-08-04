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
}
