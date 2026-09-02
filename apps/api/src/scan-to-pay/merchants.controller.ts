import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { AdminAccessGuard } from '../admin/admin-access.guard';
import { MerchantsService } from './merchants.service';
import { RegisterMerchantDto } from './dto/register-merchant.dto';

@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@Controller('merchants')
@UseGuards(JwtAuthGuard)
export class MerchantsController {
  constructor(private readonly merchants: MerchantsService) {}

  @Post('register')
  register(@Request() req: any, @Body() dto: RegisterMerchantDto) {
    return this.merchants.register(req.user.userId, dto);
  }

  @Get()
  list(@Query('q') q?: string) {
    return this.merchants.listApproved(q);
  }

  @Get('mine')
  mine(@Request() req: any) {
    return this.merchants.myStaffRoles(req.user.userId);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.merchants.getApproved(id);
  }
}

@Controller('admin/merchants')
@UseGuards(AdminAccessGuard)
export class AdminMerchantsController {
  constructor(private readonly merchants: MerchantsService) {}

  @Get('pending')
  pending() {
    return this.merchants.listPending();
  }

  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return this.merchants.approve(id);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string) {
    return this.merchants.reject(id);
  }
}
