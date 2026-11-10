import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RecordExperimentEventDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  experimentId!: string;

  @IsIn(['A', 'B'])
  variant!: 'A' | 'B';

  @IsIn(['impression', 'cta_click'])
  event!: 'impression' | 'cta_click';

  @IsString()
  @IsOptional()
  @MaxLength(500)
  path?: string;
}
