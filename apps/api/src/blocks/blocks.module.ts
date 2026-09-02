import { Module } from '@nestjs/common';
import { BlocksController } from './blocks.controller';
import { BlocksService } from './blocks.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [BlocksController],
  providers: [BlocksService, PrismaService],
  exports: [BlocksService],
})
export class BlocksModule {}
