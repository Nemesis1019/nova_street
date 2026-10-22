import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  label!: string;

  @IsString()
  @IsNotEmpty({ message: 'La dirección es obligatoria' })
  line1!: string;

  @IsString()
  @IsOptional()
  line2?: string;

  @IsString()
  @IsNotEmpty({ message: 'La ciudad es obligatoria' })
  city!: string;

  @IsString()
  @IsNotEmpty({ message: 'El estado es obligatorio' })
  state!: string;

  @IsString()
  @IsNotEmpty({ message: 'El país es obligatorio' })
  country!: string;

  @IsString()
  @IsNotEmpty({ message: 'El código postal es obligatorio' })
  zipCode!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
