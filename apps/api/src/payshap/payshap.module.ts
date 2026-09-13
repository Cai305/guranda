import { Module } from '@nestjs/common';
import { PayShapController } from './payshap.controller';
import { PayShapService } from './payshap.service';
import { WalletsModule } from '../wallets/wallets.module';
import { BlocksModule } from '../blocks/blocks.module';

@Module({
  imports: [WalletsModule, BlocksModule],
  controllers: [PayShapController],
  providers: [PayShapService],
})
export class PayShapModule {}
