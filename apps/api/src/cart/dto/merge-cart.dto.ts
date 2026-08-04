import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';

import { AnonymousCartItemDto } from './anonymous-cart-item.dto';

export class MergeCartDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AnonymousCartItemDto)
  anonymousItems!: AnonymousCartItemDto[];
}
