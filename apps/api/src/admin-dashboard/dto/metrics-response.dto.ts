import { ApiProperty } from '@nestjs/swagger';

class RecentOrderDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  totalAmount!: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  customerEmail!: string;
}

export class AdminMetricsResponseDto {
  @ApiProperty()
  totalOrders!: number;

  @ApiProperty()
  totalRevenue!: number;

  @ApiProperty()
  ordersToday!: number;

  @ApiProperty()
  pendingOrders!: number;

  @ApiProperty()
  totalUsers!: number;

  @ApiProperty()
  lowStockCount!: number;

  @ApiProperty({ type: [RecentOrderDto] })
  recentOrders!: RecentOrderDto[];
}
