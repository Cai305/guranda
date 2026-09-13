import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateFeatureVersionDto {
  @IsString()
  @MaxLength(30)
  versionLabel: string;

  // Dot-namespaced ToolDefinition.name values, e.g. "ride.request" —
  // validated against ToolRegistryService.hasTool() in the service, not
  // here (needs a DI-injected registry, not a pure decorator check).
  @IsArray()
  @IsString({ each: true })
  actionNames: string[];

  // WidgetDefinition.id values — validated against WidgetRegistryService
  // in the service, same reasoning as actionNames above.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  widgetIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionsRequired?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  changelog?: string;
}
