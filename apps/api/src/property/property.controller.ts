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
import { PropertyService } from './property.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('property')
@UseGuards(JwtAuthGuard)
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  // Listings
  @Post()
  create(@Request() req: any, @Body() body: any) {
    return this.propertyService.createProperty(req.user.userId, body);
  }

  @Get()
  browse(
    @Query('kind') kind?: string,
    @Query('listingType') listingType?: string,
  ) {
    return this.propertyService.browse({ kind, listingType });
  }

  @Get('mine')
  myProperties(@Request() req: any) {
    return this.propertyService.myProperties(req.user.userId);
  }

  @Get('rentals')
  myRentals(@Request() req: any) {
    return this.propertyService.myRentals(req.user.userId);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.propertyService.getProperty(id);
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.propertyService.updateProperty(id, req.user.userId, body);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.propertyService.deleteProperty(id, req.user.userId);
  }

  // Tenancies
  @Post(':id/tenancy')
  assignTenant(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { tenantUsername: string; rentAmount?: number },
  ) {
    return this.propertyService.assignTenant(req.user.userId, id, body);
  }

  // Rent + receipts
  @Post('tenancy/:id/pay')
  payRent(@Request() req: any, @Param('id') id: string) {
    return this.propertyService.payRent(req.user.userId, id);
  }

  // Lease
  @Get('tenancy/:id/lease')
  lease(@Request() req: any, @Param('id') id: string) {
    return this.propertyService.getLease(req.user.userId, id);
  }

  // Issues
  @Post('tenancy/:id/issues')
  reportIssue(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { title: string; description?: string },
  ) {
    return this.propertyService.reportIssue(req.user.userId, id, body);
  }

  @Patch('issues/:id')
  updateIssue(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.propertyService.updateIssue(req.user.userId, id, body.status);
  }
}
