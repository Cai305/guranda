import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { WidgetRegistryService } from './widget-registry.service';

// Query surface for "what widget types exist" — the render-side
// counterpart to GET /tools (tool-registry.controller.ts). A future
// Feature Builder / Blueprint step editor uses this to know which
// WidgetDefinition ids a FeatureVersion.widgetIds entry may reference.
@Controller('widgets')
@UseGuards(JwtAuthGuard)
export class WidgetRegistryController {
  constructor(private registry: WidgetRegistryService) {}

  @Get()
  list() {
    return this.registry.listWidgets();
  }
}
