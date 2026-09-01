import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiReminderService } from './ai-reminder.service';
import { AiReminderScheduler } from './ai-reminder.scheduler';
import { CalendarAiToolsProvider } from './calendar-ai-tools.provider';
import { GamesAiToolsProvider } from './games-ai-tools.provider';
import { PrismaService } from '../prisma.service';
import { AiRuntimeModule } from '../ai-runtime/ai-runtime.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AiRuntimeModule, NotificationsModule],
  controllers: [AiController],
  providers: [
    AiService,
    AiReminderService,
    AiReminderScheduler,
    CalendarAiToolsProvider,
    GamesAiToolsProvider,
    PrismaService,
  ],
})
export class AiModule {}
