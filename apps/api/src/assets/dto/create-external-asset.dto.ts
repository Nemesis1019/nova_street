import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CreateExternalAssetDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  url!: string;
}
