import { Module } from '@nestjs/common';
import { CouplesController } from './couples.controller';
import { CouplesService } from './couples.service';
import { AiRuntimeModule } from '../ai-runtime/ai-runtime.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AiRuntimeModule, NotificationsModule],
  controllers: [CouplesController],
  providers: [CouplesService],
  exports: [CouplesService],
})
export class CouplesModule {}
