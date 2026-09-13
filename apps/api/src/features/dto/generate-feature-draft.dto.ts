import { IsString, MaxLength, MinLength } from 'class-validator';

export class GenerateFeatureDraftDto {
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  description: string;
}
