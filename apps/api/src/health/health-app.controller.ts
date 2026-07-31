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
import { HealthAppService } from './health-app.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('health')
@UseGuards(JwtAuthGuard)
export class HealthAppController {
  constructor(private readonly healthService: HealthAppService) {}

  // Fitness
  @Post('fitness/logs')
  addFitnessLog(@Request() req: any, @Body() body: any) {
    return this.healthService.addFitnessLog(req.user.userId, body);
  }

  @Get('fitness/logs/mine')
  getMyFitnessLogs(@Request() req: any, @Query('type') type?: string) {
    return this.healthService.getMyFitnessLogs(req.user.userId, type);
  }

  @Delete('fitness/logs/:id')
  deleteFitnessLog(@Request() req: any, @Param('id') id: string) {
    return this.healthService.deleteFitnessLog(req.user.userId, id);
  }

  @Get('fitness/summary')
  getFitnessSummary(@Request() req: any) {
    return this.healthService.getFitnessSummary(req.user.userId);
  }

  // Practitioners / bookings
  @Get('practitioners')
  listPractitioners(@Query('specialty') specialty?: string) {
    return this.healthService.listPractitioners(specialty);
  }

  @Get('practitioners/mine')
  getMyPractitioner(@Request() req: any) {
    return this.healthService.getMyPractitioner(req.user.userId);
  }

  @Get('practitioners/:id')
  getPractitioner(@Param('id') id: string) {
    return this.healthService.getPractitioner(id);
  }

  @Post('practitioners')
  registerPractitioner(@Request() req: any, @Body() body: any) {
    return this.healthService.registerPractitioner(req.user.userId, body);
  }

  @Put('practitioners/:id')
  updatePractitioner(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.healthService.updatePractitioner(req.user.userId, id, body);
  }

  @Post('practitioners/:id/book')
  bookAppointment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.healthService.bookAppointment(req.user.userId, id, body);
  }

  @Get('practitioners/:id/appointments')
  getPractitionerAppointments(@Request() req: any, @Param('id') id: string) {
    return this.healthService.getPractitionerAppointments(req.user.userId, id);
  }

  @Get('appointments/mine')
  getMyAppointments(@Request() req: any) {
    return this.healthService.getMyAppointments(req.user.userId);
  }

  @Patch('appointments/:id/status')
  updateAppointmentStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.healthService.updateAppointmentStatus(
      req.user.userId,
      id,
      status,
    );
  }

  // Pharmacy
  @Get('pharmacies')
  listPharmacies() {
    return this.healthService.listPharmacies();
  }

  @Get('pharmacies/mine')
  getMyPharmacy(@Request() req: any) {
    return this.healthService.getMyPharmacy(req.user.userId);
  }

  @Get('pharmacies/mine/orders')
  getPharmacyOrders(@Request() req: any) {
    return this.healthService.getPharmacyOrders(req.user.userId);
  }

  @Get('pharmacies/:id')
  getPharmacy(@Param('id') id: string) {
    return this.healthService.getPharmacy(id);
  }

  @Post('pharmacies')
  createPharmacy(@Request() req: any, @Body() body: any) {
    return this.healthService.createPharmacy(req.user.userId, body);
  }

  @Put('pharmacies/:id')
  updatePharmacy(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.healthService.updatePharmacy(req.user.userId, id, body);
  }

  @Get('products')
  listProducts(
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.healthService.listProducts({ category, search });
  }

  @Post('pharmacies/:id/products')
  addProduct(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.healthService.addProduct(req.user.userId, id, body);
  }

  @Put('pharmacies/:id/products/:productId')
  updateProduct(
    @Request() req: any,
    @Param('id') id: string,
    @Param('productId') productId: string,
    @Body() body: any,
  ) {
    return this.healthService.updateProduct(
      req.user.userId,
      id,
      productId,
      body,
    );
  }

  @Delete('pharmacies/:id/products/:productId')
  deleteProduct(
    @Request() req: any,
    @Param('id') id: string,
    @Param('productId') productId: string,
  ) {
    return this.healthService.deleteProduct(req.user.userId, id, productId);
  }

  // Pharmacy orders
  @Post('orders')
  placeOrder(@Request() req: any, @Body() body: any) {
    return this.healthService.placeOrder(req.user.userId, body);
  }

  @Get('orders/mine')
  getMyOrders(@Request() req: any) {
    return this.healthService.getMyOrders(req.user.userId);
  }

  @Patch('orders/:id/status')
  updateOrderStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.healthService.updateOrderStatus(req.user.userId, id, status);
  }

  // Wellness
  @Get('wellness')
  listWellnessPosts(@Query('category') category?: string) {
    return this.healthService.listWellnessPosts(category);
  }

  @Get('wellness/mine')
  getMyWellnessPosts(@Request() req: any) {
    return this.healthService.getMyWellnessPosts(req.user.userId);
  }

  @Get('wellness/:id')
  getWellnessPost(@Request() req: any, @Param('id') id: string) {
    return this.healthService.getWellnessPost(id, req.user.userId);
  }

  @Post('wellness')
  createWellnessPost(@Request() req: any, @Body() body: any) {
    return this.healthService.createWellnessPost(req.user.userId, body);
  }

  @Post('wellness/:id/like')
  toggleWellnessLike(@Request() req: any, @Param('id') id: string) {
    return this.healthService.toggleWellnessLike(req.user.userId, id);
  }
}
