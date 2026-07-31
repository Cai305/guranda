import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ShoppingService } from './shopping.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('shopping')
@UseGuards(JwtAuthGuard)
export class ShoppingController {
  constructor(private readonly shoppingService: ShoppingService) {}

  @Get('stores')
  listStores(@Query('category') category?: string) {
    return this.shoppingService.listStores(category);
  }

  @Get('stores/:id')
  getStore(@Param('id') id: string) {
    return this.shoppingService.getStore(id);
  }

  @Get('my-store')
  getMyStore(@Request() req: any) {
    return this.shoppingService.getMyStore(req.user.userId);
  }

  // Takealot-style product-first browse — home feed shows products
  // across every store, not stores first.
  @Get('products')
  listProducts(
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.shoppingService.listProducts({ category, search });
  }

  @Get('products/:id')
  getProduct(@Param('id') id: string) {
    return this.shoppingService.getProduct(id);
  }

  @Post('stores')
  createStore(@Request() req: any, @Body() body: any) {
    return this.shoppingService.createStore(req.user.userId, body);
  }

  @Put('stores/:id')
  updateStore(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.shoppingService.updateStore(req.user.userId, id, body);
  }

  @Delete('stores/:id')
  deleteStore(@Request() req: any, @Param('id') id: string) {
    return this.shoppingService.deleteStore(req.user.userId, id);
  }

  @Post('stores/:id/products')
  addProduct(
    @Request() req: any,
    @Param('id') storeId: string,
    @Body() body: any,
  ) {
    return this.shoppingService.addProduct(req.user.userId, storeId, body);
  }

  @Put('stores/:id/products/:productId')
  updateProduct(
    @Request() req: any,
    @Param('id') storeId: string,
    @Param('productId') productId: string,
    @Body() body: any,
  ) {
    return this.shoppingService.updateProduct(
      req.user.userId,
      storeId,
      productId,
      body,
    );
  }

  @Delete('stores/:id/products/:productId')
  deleteProduct(
    @Request() req: any,
    @Param('id') storeId: string,
    @Param('productId') productId: string,
  ) {
    return this.shoppingService.deleteProduct(
      req.user.userId,
      storeId,
      productId,
    );
  }

  @Post('orders')
  placeOrder(@Request() req: any, @Body() body: any) {
    return this.shoppingService.placeOrder(req.user.userId, body);
  }

  @Get('orders/mine')
  getMyOrders(@Request() req: any) {
    return this.shoppingService.getMyOrders(req.user.userId);
  }

  @Get('my-store/orders')
  getStoreOrders(@Request() req: any) {
    return this.shoppingService.getStoreOrders(req.user.userId);
  }

  @Get('orders/:id')
  getOrder(@Param('id') id: string) {
    return this.shoppingService.getOrder(id);
  }

  @Patch('orders/:id/status')
  updateOrderStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.shoppingService.updateOrderStatus(req.user.userId, id, status);
  }
}
