import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { EatService } from './eat.service';
import { JwtAuthGuard } from '../auth/auth.guard';

// Previously read a client-supplied `x-user-id` header instead of the
// authenticated JWT — anyone could place orders, or create/edit/delete
// someone else's store, just by setting that header. See
// docs/testing/TEST_REPORT.md §4 (the same issue found in video.controller.ts).
@UseGuards(JwtAuthGuard)
@Controller('eat')
export class EatController {
  constructor(private readonly eat: EatService) {}

  // ── Stores ───────────────────────────────────────────────────────────────
  @Get('stores')
  listStores(@Query('category') category?: string) {
    return this.eat.listStores(category);
  }

  @Get('stores/:id')
  getStore(@Param('id') id: string) {
    return this.eat.getStore(id);
  }

  @Get('my-store')
  getMyStore(@Request() req: any) {
    return this.eat.getMyStore(req.user.userId);
  }

  @Post('stores')
  createStore(@Request() req: any, @Body() dto: any) {
    return this.eat.createStore(req.user.userId, dto);
  }

  @Put('stores/:id')
  updateStore(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.eat.updateStore(req.user.userId, id, dto);
  }

  @Delete('stores/:id')
  deleteStore(@Request() req: any, @Param('id') id: string) {
    return this.eat.deleteStore(req.user.userId, id);
  }

  // ── Products ─────────────────────────────────────────────────────────────
  @Post('stores/:id/products')
  addProduct(
    @Request() req: any,
    @Param('id') storeId: string,
    @Body() dto: any,
  ) {
    return this.eat.addProduct(req.user.userId, storeId, dto);
  }

  @Put('stores/:id/products/:productId')
  updateProduct(
    @Request() req: any,
    @Param('id') storeId: string,
    @Param('productId') productId: string,
    @Body() dto: any,
  ) {
    return this.eat.updateProduct(req.user.userId, storeId, productId, dto);
  }

  @Delete('stores/:id/products/:productId')
  deleteProduct(
    @Request() req: any,
    @Param('id') storeId: string,
    @Param('productId') productId: string,
  ) {
    return this.eat.deleteProduct(req.user.userId, storeId, productId);
  }

  // ── Orders ────────────────────────────────────────────────────────────────
  @Post('orders')
  placeOrder(@Request() req: any, @Body() dto: any) {
    return this.eat.placeOrder(req.user.userId, dto);
  }

  @Get('orders/mine')
  getMyOrders(@Request() req: any) {
    return this.eat.getMyOrders(req.user.userId);
  }

  @Get('orders/:id')
  getOrder(@Param('id') id: string) {
    return this.eat.getOrder(id);
  }

  @Get('my-store/orders')
  getStoreOrders(@Request() req: any) {
    return this.eat.getStoreOrders(req.user.userId);
  }

  @Patch('orders/:id/status')
  updateOrderStatus(
    @Request() req: any,
    @Param('id') orderId: string,
    @Body('status') status: string,
  ) {
    return this.eat.updateOrderStatus(req.user.userId, orderId, status);
  }
}
