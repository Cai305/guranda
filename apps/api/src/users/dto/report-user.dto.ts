import { IsString, MinLength, IsOptional } from 'class-validator';

export class ReportUserDto {
  @IsString()
  @MinLength(1)
  reason: string;

  @IsOptional()
  @IsString()
  details?: string;
}
