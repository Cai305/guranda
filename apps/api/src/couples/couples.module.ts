import { Module } from '@nestjs/common';
import { CouplesController } from './couples.controller';
import { CouplesService } from './couples.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [CouplesController],
  providers: [CouplesService, PrismaService],
  exports: [CouplesService],
})
export class CouplesModule {}
