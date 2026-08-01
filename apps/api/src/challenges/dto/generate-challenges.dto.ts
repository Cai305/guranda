import { IsArray, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ChallengeCategory } from '@prisma/client';

export class GenerateChallengesDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  count?: number;

  @IsOptional()
  @IsArray()
  @IsEnum(ChallengeCategory, { each: true })
  categories?: ChallengeCategory[];
}
