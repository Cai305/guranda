import { Module } from '@nestjs/common';
import { CarwashService } from './carwash.service';
import { CarwashController } from './carwash.controller';
import { CarwashAiToolsProvider } from './carwash-ai-tools.provider';
import { ToolRegistryModule } from '../tool-registry/tool-registry.module';

@Module({
  imports: [ToolRegistryModule],
  providers: [CarwashService, CarwashAiToolsProvider],
  controllers: [CarwashController],
  exports: [CarwashService],
})
export class CarwashModule {}
