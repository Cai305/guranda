import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { StoreService } from './store.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('store')
export class StoreController {
  constructor(private storeService: StoreService) {}

  @Get('apps')
  async getAllApps() {
    return this.storeService.getAllApps();
  }

  @UseGuards(JwtAuthGuard)
  @Post('apps')
  async publishApp(@Request() req: any, @Body() data: any) {
    return this.storeService.publishApp(data, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('catalog')
  async getCatalog(@Request() req: any) {
    return this.storeService.getCatalogForUser(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('installed')
  async getInstalled(@Request() req: any) {
    return this.storeService.getInstalledAppIds(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('installed/:id')
  async install(@Request() req: any, @Param('id') id: string) {
    return this.storeService.installApp(req.user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('installed/:id')
  async uninstall(@Request() req: any, @Param('id') id: string) {
    return this.storeService.uninstallApp(req.user.userId, id);
  }
}
