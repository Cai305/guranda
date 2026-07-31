import { IsNumberString } from 'class-validator';

export class RequestDepositDto {
  @IsNumberString()
  amountZar: string;
}
