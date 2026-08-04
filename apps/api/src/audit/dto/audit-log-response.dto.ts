import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class AuditLogUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;
}

export class AuditLogEntryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  action!: string;

  @ApiProperty()
  entity!: string;

  @ApiProperty()
  entityId!: string;

  @ApiPropertyOptional()
  user?: AuditLogUserDto;

  @ApiPropertyOptional()
  before?: Record<string, unknown>;

  @ApiPropertyOptional()
  after?: Record<string, unknown>;

  @ApiProperty()
  @Transform(({ value }) => (value instanceof Date ? value.toISOString() : value))
  createdAt!: string;
}

export class AuditLogListResponseDto {
  @ApiProperty({ type: [AuditLogEntryDto] })
  data!: AuditLogEntryDto[];

  @ApiProperty()
  meta!: { page: number; limit: number; total: number };
}
