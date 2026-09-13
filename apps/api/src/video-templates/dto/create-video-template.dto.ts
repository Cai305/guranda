import { IsArray, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class TextPresetDto {
  text: string;
  x: number;
  y: number;
  fontSize?: number;
  color?: string;
  startMs?: number;
  endMs?: number | null;
}

export class CreateVideoTemplateDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  filterPreset?: string;

  @IsOptional()
  @IsString()
  musicSongId?: string;

  @IsOptional()
  @IsArray()
  textPresets?: TextPresetDto[];

  @IsOptional()
  @IsInt()
  @Min(1)
  clipCount?: number;
}
