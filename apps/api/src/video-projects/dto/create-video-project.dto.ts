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
  ValidateNested,
} from 'class-validator';
import { EditPlanClipDto } from './edit-plan.dto';

export class CreateVideoProjectDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EditPlanClipDto)
  clips: EditPlanClipDto[];

  @IsOptional()
  @IsString()
  musicSongId?: string;

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
  @IsIn(['chipmunk', 'deep', 'robot', 'echo'])
  voiceEffect?: 'chipmunk' | 'deep' | 'robot' | 'echo';

  @IsOptional()
  @IsIn(['original', 'vivid', 'bw', 'warm', 'cool', 'fade'])
  filterPreset?: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  sourcePerformanceId?: string;

  @IsOptional()
  @IsIn(['DUET', 'STITCH'])
  compositionMode?: 'DUET' | 'STITCH';
}
