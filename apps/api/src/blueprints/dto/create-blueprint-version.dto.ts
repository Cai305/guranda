import { IsArray, IsObject, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// One ordered step: { actionName, inputTemplate }. inputTemplate values may
// contain "{{variable}}" placeholders resolved at execution time
// (BlueprintRun.variables, Phase 2) — accepted here as an opaque object,
// not validated field-by-field since its shape depends entirely on the
// referenced action's inputSchema.
class BlueprintStepDto {
  @IsString()
  actionName: string;

  @IsObject()
  inputTemplate: Record<string, unknown>;
}

export class CreateBlueprintVersionDto {
  @IsString()
  @MaxLength(30)
  versionLabel: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlueprintStepDto)
  steps: BlueprintStepDto[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  changelog?: string;
}
