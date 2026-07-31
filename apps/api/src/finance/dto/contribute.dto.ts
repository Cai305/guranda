import { IsNumber, IsOptional, IsPositive } from 'class-validator';

export class ContributeDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amountXrp?: number;
}
