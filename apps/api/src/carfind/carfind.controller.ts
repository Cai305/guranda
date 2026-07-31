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
import { CarFindService } from './carfind.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('carfind')
@UseGuards(JwtAuthGuard)
export class CarFindController {
  constructor(private readonly carFindService: CarFindService) {}

  @Post('listings')
  create(@Request() req: any, @Body() body: any) {
    return this.carFindService.createListing(req.user.userId, body);
  }

  @Get('listings')
  browse(@Query() query: any) {
    return this.carFindService.browse(query);
  }

  @Get('listings/mine')
  myListings(@Request() req: any) {
    return this.carFindService.myListings(req.user.userId);
  }

  @Get('enquiries/mine')
  myEnquiries(@Request() req: any) {
    return this.carFindService.myEnquiries(req.user.userId);
  }

  @Get('listings/:id')
  getOne(@Param('id') id: string) {
    return this.carFindService.getListing(id);
  }

  @Patch('listings/:id')
  update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.carFindService.updateListing(req.user.userId, id, body);
  }

  @Delete('listings/:id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.carFindService.deleteListing(req.user.userId, id);
  }

  @Post('listings/:id/enquiries')
  enquire(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { message: string },
  ) {
    return this.carFindService.sendEnquiry(req.user.userId, id, body.message);
  }
}
