import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CompleteCoupleChallengeDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
