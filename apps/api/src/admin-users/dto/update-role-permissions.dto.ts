import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class UpdateRolePermissionsDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(0)
  permissions!: string[];
}
