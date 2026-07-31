import { Module } from '@nestjs/common';
import { CarwashService } from './carwash.service';
import { CarwashController } from './carwash.controller';
import { CarwashAiToolsProvider } from './carwash-ai-tools.provider';
import { ToolRegistryModule } from '../tool-registry/tool-registry.module';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [ToolRegistryModule],
  providers: [CarwashService, PrismaService, CarwashAiToolsProvider],
  controllers: [CarwashController],
  exports: [CarwashService],
})
export class CarwashModule {}
