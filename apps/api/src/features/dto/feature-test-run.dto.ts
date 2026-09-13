import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

// Body of POST /features/builder/test-run — runs a draft (or saved
// Feature's) action sequence step-by-step through the real
// ActionExecutorService via BlueprintExecutionService.runSteps.
//
// testInput is per-step, aligned by array index with actionNames:
// testInput[i] is the input object passed to actionNames[i]. A shorter (or
// omitted) array leaves any trailing step with `{}` as its input — accepted
// as an opaque object per entry, not validated field-by-field here, same
// reasoning as CreateBlueprintVersionDto.inputTemplate (the real shape
// depends entirely on the referenced action's inputSchema).
export class FeatureTestRunDto {
  @IsArray()
  @IsString({ each: true })
  actionNames: string[];

  @IsOptional()
  @IsArray()
  testInput?: Record<string, unknown>[];

  @IsOptional()
  @IsObject()
  variables?: Record<string, string | number>;
}
