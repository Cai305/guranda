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
  MinLength,
  ValidateNested,
} from 'class-validator';

// A single pre-rendered overlay image (text or sticker) — see the schema
// comment on VideoProject.clips for why overlays are always images, never
// server-interpreted text/fonts.
export class ClipOverlayDto {
  @IsString()
  @MinLength(1)
  imageUrl: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  xNorm: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  yNorm: number;

  @IsNumber()
  @Min(0.01)
  @Max(1)
  widthNorm: number;

  @IsInt()
  @Min(0)
  startMs: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  endMs?: number | null;
}

export class EditPlanClipDto {
  @IsString()
  @MinLength(1)
  id: string;

  @IsString()
  @MinLength(1)
  sourceUrl: string;

  @IsIn(['RECORDED', 'LIBRARY'])
  sourceType: 'RECORDED' | 'LIBRARY';

  @IsInt()
  @Min(0)
  trimStartMs: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  trimEndMs?: number | null;

  @IsNumber()
  @Min(0.3)
  @Max(3)
  speed: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClipOverlayDto)
  overlays?: ClipOverlayDto[];

  /** Transition INTO the next clip; ignored on the last clip. */
  @IsOptional()
  @IsIn(['cut', 'fade', 'slide'])
  transitionOut?: 'cut' | 'fade' | 'slide';
}
