import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

// The shape a mobile client sends after a human has reviewed (and possibly
// edited) a FeatureDraft returned by POST /features/builder/draft — this is
// what actually creates the real Feature + FeatureVersion via
// FeaturesService.create/createVersion (which re-validates actionNames/
// widgetIds against the live registries regardless of what this endpoint
// already checked when the draft was generated).
export class SaveFeatureDraftDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(2000)
  description: string;

  @IsString()
  @MaxLength(50)
  category: string;

  @IsString()
  @MaxLength(50)
  icon: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gradientColors?: string[];

  @IsArray()
  @IsString({ each: true })
  actionNames: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  widgetIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionsRequired?: string[];
}
