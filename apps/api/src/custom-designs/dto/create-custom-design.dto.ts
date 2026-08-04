import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCustomDesignDto {
  @IsUUID()
  designTemplateId!: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  size?: string;
}
