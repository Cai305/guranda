import { IsObject } from 'class-validator';

// Values are accepted as an opaque object (string | number per value) same
// as CreateBlueprintVersionDto's inputTemplate — validated against what the
// steps actually need at execution time (BlueprintExecutionService throws a
// clear error naming any unresolved {{placeholder}}), not decorator-by-key
// here since the required keys depend entirely on the BlueprintVersion.
export class RunBlueprintDto {
  @IsObject()
  variables: Record<string, string | number>;
}
