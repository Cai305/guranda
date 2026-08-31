import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

const VOTING_TYPES = ['SINGLE_CHOICE', 'RANKED_CHOICE', 'MULTI_SELECT', 'WEIGHTED'];

export class CreatePositionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title: string;

  @IsIn(VOTING_TYPES)
  votingType: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  seats?: number;
}
