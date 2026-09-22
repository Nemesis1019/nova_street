import { IsEnum, IsUUID } from 'class-validator';

export class BulkProductActionDto {
  @IsEnum(['activate', 'deactivate', 'delete'] as const)
  action!: 'activate' | 'deactivate' | 'delete';

  @IsUUID('4', { each: true })
  ids!: string[];
}
