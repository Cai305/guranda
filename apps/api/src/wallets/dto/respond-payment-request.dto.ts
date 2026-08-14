import { IsBoolean } from 'class-validator';

export class RespondPaymentRequestDto {
  @IsBoolean()
  accept: boolean;
}
