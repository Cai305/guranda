import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { ChallengeCategory, ChallengeType } from '@prisma/client';

export class ProposeSponsorshipDto {
  @IsString()
  @MaxLength(150)
  title: string;

  @IsString()
  @MaxLength(2000)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  promptText?: string;

  @IsEnum(ChallengeCategory)
  category: ChallengeCategory;

  @IsEnum(ChallengeType)
  type: ChallengeType;

  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;

  @IsNumber()
  @Min(1)
  budget: number;
}
