import { IsNumberString, IsOptional, IsString, MinLength } from 'class-validator';

export class RequestPaymentDto {
  @IsString()
  @MinLength(1)
  destination: string;

  @IsNumberString()
  amount: string;

  @IsOptional()
  @IsString()
  memo?: string;
}
