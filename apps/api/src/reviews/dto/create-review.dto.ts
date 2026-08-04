import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsUUID()
  @IsOptional()
  orderId?: string;

  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayMaxSize(4)
  @IsOptional()
  assetIds?: string[];
}
