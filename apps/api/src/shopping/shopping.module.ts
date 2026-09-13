import { Module } from '@nestjs/common';
import { ShoppingController } from './shopping.controller';
import { ShoppingService } from './shopping.service';
import { ShoppingAiToolsProvider } from './shopping-ai-tools.provider';

@Module({
  controllers: [ShoppingController],
  providers: [ShoppingService, ShoppingAiToolsProvider],
  exports: [ShoppingService],
})
export class ShoppingModule {}
