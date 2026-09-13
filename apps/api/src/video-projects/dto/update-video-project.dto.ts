import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { EditPlanClipDto } from './edit-plan.dto';

// Every field optional — the editor screen PATCHes whichever part of the
// plan just changed (e.g. only `clips` after a trim, only `filterPreset`
// after picking a filter) rather than resubmitting the whole project.
export class UpdateVideoProjectDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EditPlanClipDto)
  clips?: EditPlanClipDto[];

  // Explicit null clears the music track — only run @IsString() when a
  // value is actually present, or a real "remove the song" request would
  // fail validation.
  @IsOptional()
  @ValidateIf((o) => o.musicSongId !== null)
  @IsString()
  musicSongId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  musicOffsetMs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  musicVolume?: number;

  @IsOptional()
  @IsIn(['chipmunk', 'deep', 'robot', 'echo', null])
  voiceEffect?: 'chipmunk' | 'deep' | 'robot' | 'echo' | null;

  @IsOptional()
  @IsIn(['original', 'vivid', 'bw', 'warm', 'cool', 'fade'])
  filterPreset?: string;

  @IsOptional()
  @IsString()
  caption?: string;
}
