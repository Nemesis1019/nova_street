import { ApiProperty } from '@nestjs/swagger';

export class TopProductDto {
  @ApiProperty()
  productId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  revenue!: number;
}

export class TopProductsReportDto {
  @ApiProperty({ type: [TopProductDto] })
  data!: TopProductDto[];
}
