import { ApiProperty } from '@nestjs/swagger';

export class PresignAssetResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  uploadUrl!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  size!: number;
}
