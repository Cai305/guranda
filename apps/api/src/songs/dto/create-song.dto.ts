import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateSongDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  artistName: string;

  @IsString()
  @MinLength(1)
  audioUrl: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsInt()
  @Min(1)
  durationSeconds: number;
}
