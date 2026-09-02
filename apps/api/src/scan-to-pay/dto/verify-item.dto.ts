import { IsString } from 'class-validator';

export class VerifyItemDto {
  @IsString()
  transactionId: string;

  @IsString()
  barcode: string;
}
