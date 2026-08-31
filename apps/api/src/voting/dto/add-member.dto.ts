import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class AddMemberDto {
  @IsString()
  @MinLength(1)
  username: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  votingWeight?: number;
}
