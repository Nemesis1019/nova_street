import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class UpdateUserPermissionsDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(0)
  permissions!: string[];
}
