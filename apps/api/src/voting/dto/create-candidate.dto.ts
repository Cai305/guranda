import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCandidateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  slateName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(9)
  colorHex?: string;
}
