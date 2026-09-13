import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller';
import { AiRuntimeModule } from '../ai-runtime/ai-runtime.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { McpPendingActionsService } from './mcp-pending-actions.service';

@Module({
  imports: [AiRuntimeModule, NotificationsModule],
  controllers: [McpController],
  providers: [McpPendingActionsService],
})
export class McpModule {}
