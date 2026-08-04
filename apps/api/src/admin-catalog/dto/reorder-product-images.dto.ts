import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class ReorderProductImagesDto {
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayMinSize(1)
  imageIds!: string[];
}
