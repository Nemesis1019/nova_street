import { IsNumber, Max, Min } from 'class-validator';

export class UpdateAssetCropDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  focalPointX!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  focalPointY!: number;

  @IsNumber()
  @Min(1)
  @Max(2)
  cropZoom!: number;
}
