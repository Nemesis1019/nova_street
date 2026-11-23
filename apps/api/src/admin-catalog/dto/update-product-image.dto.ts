import { IsOptional, IsUUID } from 'class-validator';

export class UpdateProductImageDto {
  /** null desasocia la imagen de toda variante. */
  @IsUUID()
  @IsOptional()
  productVariantId?: string | null;
}
