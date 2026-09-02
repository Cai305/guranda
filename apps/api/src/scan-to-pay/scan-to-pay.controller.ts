import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/auth.guard';
import { ScanToPayService } from './scan-to-pay.service';
import { StartSessionDto } from './dto/start-session.dto';
import { ScanItemDto, UpdateItemDto } from './dto/scan-item.dto';
import { PaySessionDto } from './dto/pay-session.dto';
import { VerifyItemDto } from './dto/verify-item.dto';

@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@Controller('scan-to-pay')
@UseGuards(JwtAuthGuard)
export class ScanToPayController {
  constructor(private readonly scanToPay: ScanToPayService) {}

  // ── Sessions ───────────────────────────────────────────────────────────

  @Post('sessions')
  startSession(@Request() req: any, @Body() dto: StartSessionDto) {
    return this.scanToPay.startSession(req.user.userId, dto);
  }

  // NestJS sends an empty body (not the literal "null") when a handler
  // returns null, which breaks `res.json()` on the client for the common
  // "no active session" case — @Res() bypasses that and sends real JSON.
  @Get('sessions/active')
  async activeSession(@Request() req: any, @Res() res: Response) {
    res.json(await this.scanToPay.getActiveSession(req.user.userId));
  }

  @Get('sessions/:id')
  session(@Request() req: any, @Param('id') id: string) {
    return this.scanToPay.getSession(req.user.userId, id);
  }

  @Post('sessions/:id/cancel')
  cancel(@Request() req: any, @Param('id') id: string) {
    return this.scanToPay.cancelSession(req.user.userId, id);
  }

  // ── Cart ───────────────────────────────────────────────────────────────

  @Post('sessions/:id/items')
  addItem(@Request() req: any, @Param('id') id: string, @Body() dto: ScanItemDto) {
    return this.scanToPay.addItem(req.user.userId, id, dto);
  }

  @Patch('sessions/:id/items/:itemId')
  updateItem(
    @Request() req: any,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.scanToPay.updateItem(req.user.userId, id, itemId, dto);
  }

  @Delete('sessions/:id/items/:itemId')
  removeItem(@Request() req: any, @Param('id') id: string, @Param('itemId') itemId: string) {
    return this.scanToPay.removeItem(req.user.userId, id, itemId);
  }

  // Same null-body fix as sessions/active — most barcodes won't have a
  // prior scan to prefill from.
  @Get('barcode-lookup/:barcode')
  async lookupBarcode(@Param('barcode') barcode: string, @Res() res: Response) {
    res.json(await this.scanToPay.lookupBarcode(barcode));
  }

  // ── Payment ────────────────────────────────────────────────────────────

  @Post('sessions/:id/pay')
  pay(@Request() req: any, @Param('id') id: string, @Body() dto: PaySessionDto) {
    return this.scanToPay.pay(req.user.userId, id, dto.checkoutToken);
  }

  // ── Receipts ───────────────────────────────────────────────────────────

  @Get('receipts')
  myReceipts(@Request() req: any) {
    return this.scanToPay.myReceipts(req.user.userId);
  }

  @Get('receipts/:id')
  receipt(@Request() req: any, @Param('id') id: string) {
    return this.scanToPay.getReceipt(req.user.userId, id);
  }

  // ── Merchant staff — checkout QR ──────────────────────────────────────

  @Post('merchant/stores/:storeId/checkout-qr')
  generateCheckoutQr(@Request() req: any, @Param('storeId') storeId: string) {
    return this.scanToPay.generateCheckoutQr(req.user.userId, storeId);
  }

  // Same null-body fix — this is null on every poll until a payment lands.
  @Get('merchant/stores/:storeId/latest-transaction')
  async latestTransaction(
    @Request() req: any,
    @Param('storeId') storeId: string,
    @Query('since') since: string | undefined,
    @Res() res: Response,
  ) {
    res.json(await this.scanToPay.latestPaidTransaction(req.user.userId, storeId, since));
  }

  // ── Merchant staff — security verification ────────────────────────────

  @Get('security/receipts/:id')
  verifyReceipt(@Request() req: any, @Param('id') id: string) {
    return this.scanToPay.verifyReceipt(req.user.userId, id);
  }

  @Post('security/verify-item')
  verifyItem(@Request() req: any, @Body() dto: VerifyItemDto) {
    return this.scanToPay.verifyItem(req.user.userId, dto.transactionId, dto.barcode);
  }
}
