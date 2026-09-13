import { IsIn } from 'class-validator';
import { PAYSHAP_BANK_IDS } from '../payshap-banks';

export class BankIdDto {
  @IsIn(PAYSHAP_BANK_IDS)
  bankId: string;
}
