import { IsBoolean } from 'class-validator';

export class SetStorefrontApprovalDto {
  @IsBoolean()
  required!: boolean;
}
