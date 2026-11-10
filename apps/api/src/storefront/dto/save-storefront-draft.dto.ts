import { IsObject } from 'class-validator';

export class SaveStorefrontDraftDto {
  @IsObject()
  doc!: Record<string, unknown>;
}
