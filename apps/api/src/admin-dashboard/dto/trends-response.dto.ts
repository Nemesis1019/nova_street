import { ApiProperty } from '@nestjs/swagger';

class DailyTrendDto {
  @ApiProperty()
  date!: string;

  @ApiProperty()
  orders!: number;

  @ApiProperty()
  revenue!: number;
}

export class AdminTrendsResponseDto {
  @ApiProperty({ type: [DailyTrendDto] })
  data!: DailyTrendDto[];
}
