import { IsIn, IsNumberString, IsOptional, IsString, MinLength } from 'class-validator';
import { PAYSHAP_BANK_IDS } from '../payshap-banks';

export class SendViaPayShapDto {
  @IsString()
  @MinLength(1)
  number: string;

  @IsIn(PAYSHAP_BANK_IDS)
  bankId: string;

  @IsNumberString()
  amount: string;
}

export class RequestViaPayShapDto {
  @IsString()
  @MinLength(1)
  number: string;

  @IsNumberString()
  amount: string;

  @IsOptional()
  @IsString()
  memo?: string;
}
