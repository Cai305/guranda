import { Module } from '@nestjs/common';
import { ShoppingController } from './shopping.controller';
import { ShoppingService } from './shopping.service';
import { ShoppingAiToolsProvider } from './shopping-ai-tools.provider';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [ShoppingController],
  providers: [ShoppingService, PrismaService, ShoppingAiToolsProvider],
  exports: [ShoppingService],
})
export class ShoppingModule {}
