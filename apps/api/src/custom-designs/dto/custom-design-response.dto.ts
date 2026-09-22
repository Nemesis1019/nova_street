import { ApiProperty } from '@nestjs/swagger';

export class CustomDesignElementResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty({ required: false })
  assetUrl?: string;

  @ApiProperty({ required: false })
  textContent?: string;

  @ApiProperty()
  fontSize!: number;

  @ApiProperty()
  fill!: string;

  @ApiProperty()
  positionX!: number;

  @ApiProperty()
  positionY!: number;

  @ApiProperty()
  scale!: number;

  @ApiProperty()
  rotation!: number;

  @ApiProperty()
  zIndex!: number;
}

export class CustomDesignResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ format: 'uuid' })
  designTemplateId!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ required: false })
  color?: string;

  @ApiProperty({ required: false })
  size?: string;

  @ApiProperty({ required: false })
  previewImageUrl?: string;

  @ApiProperty({ required: false })
  finalPrintFileUrl?: string;

  @ApiProperty()
  surcharge!: number;

  @ApiProperty({ required: false })
  rejectionReason?: string;

  @ApiProperty({ format: 'uuid', required: false })
  reviewedById?: string;

  @ApiProperty({ required: false })
  reviewedAt?: string;

  @ApiProperty({ type: [CustomDesignElementResponseDto] })
  elements!: CustomDesignElementResponseDto[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class CustomDesignListResponseDto {
  @ApiProperty({ type: () => [CustomDesignResponseDto] })
  data!: CustomDesignResponseDto[];

  @ApiProperty()
  meta!: { page: number; limit: number; total: number };
}
