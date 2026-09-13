import { Module } from '@nestjs/common';
import { MerchantsController, AdminMerchantsController } from './merchants.controller';
import { MerchantsService } from './merchants.service';
import { ScanToPayController } from './scan-to-pay.controller';
import { ScanToPayService } from './scan-to-pay.service';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [AdminModule],
  controllers: [MerchantsController, AdminMerchantsController, ScanToPayController],
  providers: [MerchantsService, ScanToPayService],
  exports: [MerchantsService, ScanToPayService],
})
export class ScanToPayModule {}
