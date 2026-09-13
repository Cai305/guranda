import { Global, Module } from '@nestjs/common';
import { ToolRegistryService } from './tool-registry.service';
import { ToolRegistryController } from './tool-registry.controller';

// @Global so any module's *-ai-tools.provider.ts can inject ToolRegistryService
// without every module having to import ToolRegistryModule explicitly.
@Global()
@Module({
  controllers: [ToolRegistryController],
  providers: [ToolRegistryService],
  exports: [ToolRegistryService],
})
export class ToolRegistryModule {}
