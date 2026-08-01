import { IsInt, Max, Min } from 'class-validator';

export class VoteDto {
  @IsInt()
  @Min(1)
  @Max(10)
  value: number;
}
