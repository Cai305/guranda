import { IsNumberString, IsString, MinLength } from 'class-validator';

export class SendMashelenDto {
  @IsString()
  @MinLength(1)
  destination: string;

  // Amount arrives as a string (matches the existing service signature,
  // which parses it as a Decimal) — validated as numeric-string here rather
  // than coerced to a JS number, to avoid float-precision loss on a
  // money-moving field.
  @IsNumberString()
  amount: string;
}
