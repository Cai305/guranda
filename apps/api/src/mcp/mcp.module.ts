import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller';
import { AiRuntimeModule } from '../ai-runtime/ai-runtime.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaService } from '../prisma.service';
import { McpPendingActionsService } from './mcp-pending-actions.service';

@Module({
  imports: [AiRuntimeModule, NotificationsModule],
  controllers: [McpController],
  providers: [PrismaService, McpPendingActionsService],
})
export class McpModule {}
