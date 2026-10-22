import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStoreRedirectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  fromPath!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  toUrl!: string;

  @IsInt()
  @IsIn([301, 302, 307, 308])
  @IsOptional()
  statusCode?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
