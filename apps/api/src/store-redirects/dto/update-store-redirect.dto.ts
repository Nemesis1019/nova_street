import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateStoreRedirectDto {
  @IsString()
  @IsOptional()
  @MaxLength(300)
  fromPath?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  toUrl?: string;

  @IsInt()
  @IsIn([301, 302, 307, 308])
  @IsOptional()
  statusCode?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
