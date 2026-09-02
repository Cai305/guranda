import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma.service';
import { ChatAiToolsProvider } from './chat-ai-tools.provider';
import { CallService } from '../calls/call.service';
import { CallsController } from '../calls/calls.controller';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BlocksModule } from '../blocks/blocks.module';
import { AchievementsModule } from '../achievements/achievements.module';

@Module({
  imports: [UsersModule, NotificationsModule, BlocksModule, AchievementsModule],
  controllers: [ChatController, CallsController],
  providers: [
    ChatGateway,
    ChatService,
    PrismaService,
    ChatAiToolsProvider,
    CallService,
  ],
  exports: [ChatGateway, ChatService],
})
export class ChatModule {}
