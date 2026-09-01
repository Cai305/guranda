import { Module } from '@nestjs/common';
import { ReactionsService } from './reactions.service';
import { ReactionsController } from './reactions.controller';
import { PrismaService } from '../prisma.service';
import { VerificationModule } from '../verification/verification.module';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [VerificationModule, EventsModule, NotificationsModule],
  controllers: [ReactionsController],
  providers: [ReactionsService, PrismaService],
  exports: [ReactionsService],
})
export class ReactionsModule {}
