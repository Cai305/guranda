import { Module } from '@nestjs/common';
import { ChessService } from './chess.service';
import { ChessGateway } from './chess.gateway';
import { ChessController } from './chess.controller';
import { PrismaService } from '../prisma.service';
import { ChessAiToolsProvider } from './chess-ai-tools.provider';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ChessController],
  providers: [ChessService, ChessGateway, PrismaService, ChessAiToolsProvider],
  exports: [ChessService],
})
export class ChessModule {}
