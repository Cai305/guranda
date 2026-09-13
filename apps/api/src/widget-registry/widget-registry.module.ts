import { Module } from '@nestjs/common';
import { WidgetRegistryService } from './widget-registry.service';
import { WidgetRegistryController } from './widget-registry.controller';

@Module({
  controllers: [WidgetRegistryController],
  providers: [WidgetRegistryService],
  exports: [WidgetRegistryService],
})
export class WidgetRegistryModule {}
