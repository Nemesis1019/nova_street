import { ApiProperty } from '@nestjs/swagger';

export class ConversionReportDto {
  @ApiProperty()
  cartToOrderRate!: number;
}
