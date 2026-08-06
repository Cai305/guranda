import { Module } from '@nestjs/common';
import { MentionsService } from './mentions.service';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [MentionsService, PrismaService],
  exports: [MentionsService],
})
export class MentionsModule {}
