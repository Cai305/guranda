import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePerformanceDto {
  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  offsetMs?: number;

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED'])
  status?: 'DRAFT' | 'PUBLISHED';
}

export class CreatePerformanceCommentDto {
  @IsString()
  text: string;
}
