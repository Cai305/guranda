import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateStokvelDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  category: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsNumber()
  @IsPositive()
  contributionAmount: number;

  @IsOptional()
  @IsString()
  contributionFrequency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  joiningFee?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  votingThresholdPct?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  minMembers?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  signerQuorum?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  withdrawalRules?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  loanRules?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  fundingRules?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  latePenaltyPct?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  approvalWorkflow?: string;
}
