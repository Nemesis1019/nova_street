import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewStorefrontApprovalDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;
}
