import { IsEnum, IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export enum PerformanceModeDto {
  SONG_SYNC = 'SONG_SYNC',
  KARAOKE = 'KARAOKE',
  ADD_AFTER = 'ADD_AFTER',
  // Produced only by the video-editor render pipeline (video-render.service),
  // never posted directly by a client — see the schema comment on
  // PerformanceMode.EDITED.
  EDITED = 'EDITED',
}

export class CreatePerformanceDto {
  // Required for SONG_SYNC/KARAOKE/ADD_AFTER, optional for EDITED (a plain
  // edited clip may carry no music) — enforced in the service, not here.
  @IsOptional()
  @IsString()
  @MinLength(1)
  songId?: string;

  @IsEnum(PerformanceModeDto)
  mode: PerformanceModeDto;

  @IsString()
  @MinLength(1)
  videoUrl: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  offsetMs?: number;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED'])
  status?: 'DRAFT' | 'PUBLISHED';
}
