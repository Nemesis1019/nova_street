import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  role!: string;

  @ApiProperty()
  emailVerified!: boolean;
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  user!: AuthUserDto;
}

export class RegisterResponseDto extends LoginResponseDto {}

export class RefreshResponseDto {
  @ApiProperty()
  accessToken!: string;
}
