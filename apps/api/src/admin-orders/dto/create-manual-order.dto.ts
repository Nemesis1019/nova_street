import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ManualOrderItemDto {
  @ApiProperty({ format: 'uuid', description: 'Variante del producto' })
  @IsUUID()
  variantId!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class ManualOrderAddressDto {
  @ApiPropertyOptional({ description: 'Etiqueta de la dirección', example: 'Casa' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  label?: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  line1!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(300)
  line2?: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  city!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  state!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  country!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  zipCode!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(150)
  company?: string;
}

export class CreateManualOrderDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Cliente existente por id' })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: 'Cliente existente por email (alternativo a userId)' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ type: [ManualOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ManualOrderItemDto)
  items!: ManualOrderItemDto[];

  @ApiPropertyOptional({ format: 'uuid', description: 'Dirección guardada del cliente' })
  @IsUUID()
  @IsOptional()
  addressId?: string;

  @ApiPropertyOptional({ type: ManualOrderAddressDto, description: 'Dirección nueva (se crea para el cliente)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ManualOrderAddressDto)
  address?: ManualOrderAddressDto;

  @ApiPropertyOptional({ format: 'uuid', description: 'Opción de envío' })
  @IsUUID()
  @IsOptional()
  shippingOptionId?: string;

  @ApiPropertyOptional({ enum: ['PENDING', 'PAID'], description: 'Estado inicial del pago' })
  @IsIn(['PENDING', 'PAID'])
  @IsOptional()
  paymentStatus?: 'PENDING' | 'PAID';

  @ApiPropertyOptional({ description: 'Notas internas' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  adminNotes?: string;

  @ApiPropertyOptional({ description: 'Notas visibles para el cliente' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  customerNotes?: string;
}
