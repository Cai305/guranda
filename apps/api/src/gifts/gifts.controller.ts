import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { GiftsService } from './gifts.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('gifts')
@UseGuards(JwtAuthGuard)
export class GiftsController {
  constructor(private readonly giftsService: GiftsService) {}

  @Get('catalog')
  catalog() {
    return this.giftsService.catalog();
  }

  @Get('my-discount')
  myDiscount(@Request() req: any) {
    return this.giftsService.myGiftDiscount(req.user.userId);
  }

  @Post('send')
  send(@Request() req: any, @Body() body: any) {
    return this.giftsService.sendGift(req.user.userId, body);
  }

  @Get('sent')
  sent(@Request() req: any) {
    return this.giftsService.sentByMe(req.user.userId);
  }

  @Get('received')
  received(@Request() req: any) {
    return this.giftsService.receivedByMe(req.user.userId);
  }

  @Get('stats/mine')
  stats(@Request() req: any) {
    return this.giftsService.statsForUser(req.user.userId);
  }

  @Get('for/:context/:contextId')
  forContent(
    @Param('context') context: string,
    @Param('contextId') contextId: string,
  ) {
    return this.giftsService.forContent(context, contextId);
  }
}
