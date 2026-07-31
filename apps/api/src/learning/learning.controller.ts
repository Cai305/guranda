import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { LearningService } from './learning.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('learning')
@UseGuards(JwtAuthGuard)
export class LearningController {
  constructor(private readonly learning: LearningService) {}

  // Courses
  @Post('courses')
  createCourse(@Request() req: any, @Body() body: any) {
    return this.learning.createCourse(req.user.userId, body);
  }

  @Get('courses/mine')
  myCreatedCourses(@Request() req: any) {
    return this.learning.myCreatedCourses(req.user.userId);
  }

  @Get('courses')
  listCourses(
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.learning.listCourses(category, search);
  }

  @Get('courses/:id')
  getCourse(@Request() req: any, @Param('id') id: string) {
    return this.learning.getCourse(id, req.user.userId);
  }

  @Post('courses/:id/lessons')
  addLesson(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.learning.addLesson(req.user.userId, id, body);
  }

  @Post('courses/:id/enroll')
  enroll(@Request() req: any, @Param('id') id: string) {
    return this.learning.enroll(req.user.userId, id);
  }

  @Get('enrollments/mine')
  myEnrollments(@Request() req: any) {
    return this.learning.myEnrollments(req.user.userId);
  }

  @Post('lessons/:id/complete')
  completeLesson(@Request() req: any, @Param('id') id: string) {
    return this.learning.completeLesson(req.user.userId, id);
  }

  @Get('certificates/mine')
  myCertificates(@Request() req: any) {
    return this.learning.myCertificates(req.user.userId);
  }

  // Tutors
  @Post('tutors')
  registerTutor(@Request() req: any, @Body() body: any) {
    return this.learning.registerTutor(req.user.userId, body);
  }

  @Patch('tutors/mine')
  updateTutor(@Request() req: any, @Body() body: any) {
    return this.learning.updateTutor(req.user.userId, body);
  }

  @Get('tutors/mine')
  getMyTutorProfile(@Request() req: any) {
    return this.learning.getMyTutorProfile(req.user.userId);
  }

  @Get('tutors')
  listTutors(@Query('subject') subject?: string) {
    return this.learning.listTutors(subject);
  }

  @Get('tutors/:id')
  getTutor(@Param('id') id: string) {
    return this.learning.getTutor(id);
  }

  @Post('tutors/:id/book')
  bookSession(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.learning.bookSession(req.user.userId, id, body);
  }

  @Get('tutors/:id/sessions')
  myTutorSessions(@Request() req: any) {
    return this.learning.myTutorSessions(req.user.userId);
  }

  @Get('sessions/mine')
  myBookedSessions(@Request() req: any) {
    return this.learning.myBookedSessions(req.user.userId);
  }

  @Patch('sessions/:id/status')
  updateSessionStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.learning.updateSessionStatus(req.user.userId, id, body.status);
  }

  // Communities
  @Post('communities')
  createCommunity(@Request() req: any, @Body() body: any) {
    return this.learning.createCommunity(req.user.userId, body);
  }

  @Get('communities/mine')
  myCommunities(@Request() req: any) {
    return this.learning.myCommunities(req.user.userId);
  }

  @Get('communities')
  listCommunities(@Query('topic') topic?: string) {
    return this.learning.listCommunities(topic);
  }

  @Get('communities/:id')
  getCommunity(@Request() req: any, @Param('id') id: string) {
    return this.learning.getCommunity(id, req.user.userId);
  }

  @Post('communities/:id/join')
  joinCommunity(@Request() req: any, @Param('id') id: string) {
    return this.learning.joinCommunity(req.user.userId, id);
  }

  @Post('communities/:id/posts')
  createPost(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.learning.createPost(req.user.userId, id, body.content);
  }
}
