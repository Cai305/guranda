import { Module } from '@nestjs/common';
import { ToolRegistryModule } from '../tool-registry/tool-registry.module';
import { DeviceAiToolsProvider } from './device-ai-tools.provider';

// No controller/service of its own — this module exists purely to register
// the device.* tool definitions (contacts/calendar/photos) with the shared
// Tool Registry at boot. All real work happens client-side on the phone.
@Module({
  imports: [ToolRegistryModule],
  providers: [DeviceAiToolsProvider],
})
export class DeviceModule {}
