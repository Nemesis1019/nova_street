import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class AdminUserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiProperty()
  emailVerified!: boolean;

  @ApiProperty()
  acceptedTerms!: boolean;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  isSuspended!: boolean;

  @ApiPropertyOptional()
  @Transform(({ value }) => (value instanceof Date ? value.toISOString() : value))
  suspendedAt?: string;

  @ApiPropertyOptional()
  suspendedReason?: string;

  @ApiProperty()
  @Transform(({ value }) => (value instanceof Date ? value.toISOString() : value))
  createdAt!: string;

  @ApiProperty()
  role!: { name: string };
}

export class AdminUserListResponseDto {
  @ApiProperty({ type: [AdminUserResponseDto] })
  data!: AdminUserResponseDto[];

  @ApiProperty()
  meta!: { page: number; limit: number; total: number };
}
