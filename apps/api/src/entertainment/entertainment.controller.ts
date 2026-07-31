import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { EntertainmentService } from './entertainment.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('entertainment')
@UseGuards(JwtAuthGuard)
export class EntertainmentController {
  constructor(private readonly entertainmentService: EntertainmentService) {}

  // Movies
  @Get('movies')
  listMovies(@Query('genre') genre?: string) {
    return this.entertainmentService.listMovies({ genre });
  }

  @Get('movies/:id')
  getMovie(@Param('id') id: string) {
    return this.entertainmentService.getMovie(id);
  }

  @Post('movies/showtimes/:id/book')
  bookMovieShowtime(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.entertainmentService.bookMovieShowtime(
      req.user.userId,
      id,
      body,
    );
  }

  // Music / Concerts
  @Get('concerts')
  listConcerts(@Query('city') city?: string) {
    return this.entertainmentService.listConcerts({ city });
  }

  @Get('concerts/:id')
  getConcert(@Param('id') id: string) {
    return this.entertainmentService.getConcert(id);
  }

  @Post('concerts/:id/book')
  bookConcert(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.entertainmentService.bookConcert(req.user.userId, id, body);
  }

  // Live Events
  @Get('events')
  listEvents(
    @Query('category') category?: string,
    @Query('city') city?: string,
  ) {
    return this.entertainmentService.listEvents({ category, city });
  }

  // Literal routes before ':id' — otherwise Nest matches 'mine' as an :id.
  @Get('events/mine')
  myEvents(@Request() req: any) {
    return this.entertainmentService.myEvents(req.user.userId);
  }

  @Post('events/invite/redeem')
  redeemInviteCode(@Request() req: any, @Body() body: { code: string }) {
    return this.entertainmentService.redeemInviteCode(
      req.user.userId,
      body.code,
    );
  }

  @Get('events/:id')
  getEvent(@Param('id') id: string) {
    return this.entertainmentService.getEvent(id);
  }

  @Post('events')
  createEvent(@Request() req: any, @Body() body: any) {
    return this.entertainmentService.createEvent(req.user.userId, body);
  }

  @Put('events/:id')
  updateEvent(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.entertainmentService.updateEvent(req.user.userId, id, body);
  }

  @Delete('events/:id')
  deleteEvent(@Request() req: any, @Param('id') id: string) {
    return this.entertainmentService.deleteEvent(req.user.userId, id);
  }

  @Post('events/:id/book')
  bookEvent(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.entertainmentService.bookEvent(req.user.userId, id, body);
  }

  // Team management
  @Get('events/:id/team')
  getTeam(@Request() req: any, @Param('id') id: string) {
    return this.entertainmentService.getTeam(req.user.userId, id);
  }

  @Post('events/:id/managers')
  addCoManager(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { username: string },
  ) {
    return this.entertainmentService.addCoManager(
      req.user.userId,
      id,
      body.username,
    );
  }

  @Delete('events/:id/managers/:userId')
  removeCoManager(
    @Request() req: any,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.entertainmentService.removeCoManager(
      req.user.userId,
      id,
      userId,
    );
  }

  @Post('events/:id/scanners')
  addScanner(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { username: string },
  ) {
    return this.entertainmentService.addScanner(
      req.user.userId,
      id,
      body.username,
    );
  }

  @Delete('events/:id/scanners/:userId')
  removeScanner(
    @Request() req: any,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.entertainmentService.removeScanner(req.user.userId, id, userId);
  }

  @Post('events/:id/invite/regenerate')
  regenerateInviteCode(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { type: 'manager' | 'scanner' },
  ) {
    return this.entertainmentService.regenerateInviteCode(
      req.user.userId,
      id,
      body.type,
    );
  }

  // Ticket check-in
  @Post('events/:id/tickets/verify')
  verifyTicket(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { code: string },
  ) {
    return this.entertainmentService.verifyTicket(
      req.user.userId,
      id,
      body.code,
    );
  }

  @Get('events/:id/tickets/stats')
  eventTicketStats(@Request() req: any, @Param('id') id: string) {
    return this.entertainmentService.eventTicketStats(req.user.userId, id);
  }

  // My Bookings
  @Get('bookings/mine')
  myBookings(@Request() req: any) {
    return this.entertainmentService.myBookings(req.user.userId);
  }

  @Get('bookings/:id/tickets')
  myTicketsForBooking(@Request() req: any, @Param('id') id: string) {
    return this.entertainmentService.myTicketsForBooking(req.user.userId, id);
  }
}
