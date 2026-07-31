import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller';
import { AiRuntimeModule } from '../ai-runtime/ai-runtime.module';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [AiRuntimeModule],
  controllers: [McpController],
  providers: [PrismaService],
})
export class McpModule {}
