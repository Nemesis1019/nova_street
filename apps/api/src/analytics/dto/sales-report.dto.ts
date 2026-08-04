import { ApiProperty } from '@nestjs/swagger';

export class SalesPointDto {
  @ApiProperty()
  label!: string;

  @ApiProperty()
  revenue!: number;

  @ApiProperty()
  orders!: number;
}

export class SalesReportDto {
  @ApiProperty()
  totalRevenue!: number;

  @ApiProperty()
  totalOrders!: number;

  @ApiProperty()
  averageOrderValue!: number;

  @ApiProperty({ type: [SalesPointDto] })
  data!: SalesPointDto[];
}
