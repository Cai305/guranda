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
  UseGuards,
} from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('marketplace')
@UseGuards(JwtAuthGuard)
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Post('listings')
  create(@Request() req: any, @Body() body: any) {
    return this.marketplaceService.createListing(req.user.userId, body);
  }

  @Get('listings')
  browse(
    @Query('category') category?: string,
    @Query('listingType') listingType?: string,
    @Query('search') search?: string,
  ) {
    return this.marketplaceService.browse({ category, listingType, search });
  }

  @Get('listings/mine')
  myListings(@Request() req: any) {
    return this.marketplaceService.myListings(req.user.userId);
  }

  @Get('listings/my-bids')
  myBids(@Request() req: any) {
    return this.marketplaceService.myBids(req.user.userId);
  }

  @Get('invoices/mine')
  myInvoices(@Request() req: any) {
    return this.marketplaceService.myInvoices(req.user.userId);
  }

  @Get('invoices/:id')
  getInvoice(@Request() req: any, @Param('id') id: string) {
    return this.marketplaceService.getInvoice(req.user.userId, id);
  }

  @Get('listings/:id')
  getOne(@Param('id') id: string) {
    return this.marketplaceService.getListing(id);
  }

  @Patch('listings/:id/cancel')
  cancel(@Request() req: any, @Param('id') id: string) {
    return this.marketplaceService.cancelListing(req.user.userId, id);
  }

  @Patch('listings/:id')
  update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.marketplaceService.updateListing(req.user.userId, id, body);
  }

  @Delete('listings/:id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.marketplaceService.deleteListing(req.user.userId, id);
  }

  @Post('listings/:id/buy')
  buyNow(@Request() req: any, @Param('id') id: string) {
    return this.marketplaceService.buyNow(req.user.userId, id);
  }

  @Post('listings/:id/bid')
  placeBid(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { amount: number },
  ) {
    return this.marketplaceService.placeBid(
      req.user.userId,
      id,
      Number(body.amount),
    );
  }
}
