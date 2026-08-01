import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUrl, Min, MaxLength } from 'class-validator';
import { ChallengeCategory, ChallengeType } from '@prisma/client';

export class UpdateChallengeDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  promptText?: string;

  @IsOptional()
  @IsEnum(ChallengeCategory)
  category?: ChallengeCategory;

  @IsOptional()
  @IsEnum(ChallengeType)
  type?: ChallengeType;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  xpReward?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bonusXpReward?: number;

  @IsOptional()
  @IsUrl({ require_tld: false })
  coverImageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sponsorLabel?: string;
}
