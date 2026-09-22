import { ApiProperty } from '@nestjs/swagger';

export class AdminRoleResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true, type: String })
  description!: string | null;

  @ApiProperty({ type: [String] })
  permissions!: string[];
}

export class AdminRoleListResponseDto {
  @ApiProperty({ type: [AdminRoleResponseDto] })
  data!: AdminRoleResponseDto[];
}
