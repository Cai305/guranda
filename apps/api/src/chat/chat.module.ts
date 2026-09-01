import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma.service';
import { ChatAiToolsProvider } from './chat-ai-tools.provider';
import { CallService } from '../calls/call.service';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [UsersModule, NotificationsModule],
  controllers: [ChatController],
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
