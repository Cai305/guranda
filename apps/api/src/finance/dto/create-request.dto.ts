import { IsNumber, IsOptional, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFundingRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsNumber()
  @IsPositive()
  amountXrp: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  recipientAddress?: string;
}
