import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { WorkService } from './work.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('work')
@UseGuards(JwtAuthGuard)
export class WorkController {
  constructor(private readonly workService: WorkService) {}

  // Companies
  @Get('companies')
  listCompanies(@Query('industry') industry?: string) {
    return this.workService.listCompanies(industry);
  }

  @Get('companies/mine')
  getMyCompany(@Request() req: any) {
    return this.workService.getMyCompany(req.user.userId);
  }

  @Get('companies/:id')
  getCompany(@Param('id') id: string) {
    return this.workService.getCompany(id);
  }

  @Post('companies')
  createCompany(@Request() req: any, @Body() body: any) {
    return this.workService.createCompany(req.user.userId, body);
  }

  @Put('companies/:id')
  updateCompany(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.workService.updateCompany(req.user.userId, id, body);
  }

  // Jobs
  @Get('jobs')
  listJobs(
    @Query('locationType') locationType?: string,
    @Query('employmentType') employmentType?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.workService.listJobs({
      locationType,
      employmentType,
      category,
      search,
    });
  }

  @Get('jobs/mine')
  getMyJobs(@Request() req: any) {
    return this.workService.getMyJobs(req.user.userId);
  }

  @Get('jobs/:id')
  getJob(@Param('id') id: string) {
    return this.workService.getJob(id);
  }

  @Post('jobs')
  createJob(@Request() req: any, @Body() body: any) {
    return this.workService.createJob(req.user.userId, body);
  }

  @Patch('jobs/:id')
  updateJob(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.workService.updateJob(req.user.userId, id, body);
  }

  @Post('jobs/:id/apply')
  applyToJob(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.workService.applyToJob(req.user.userId, id, body);
  }

  @Get('jobs/:id/applicants')
  getJobApplicants(@Request() req: any, @Param('id') id: string) {
    return this.workService.getJobApplicants(req.user.userId, id);
  }

  @Patch('applications/:id/status')
  updateApplicationStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.workService.updateApplicationStatus(
      req.user.userId,
      id,
      status,
    );
  }

  @Get('applications/mine')
  getMyApplications(@Request() req: any) {
    return this.workService.getMyApplications(req.user.userId);
  }

  // Freelance gigs
  @Get('gigs')
  listGigs(
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.workService.listGigs({ category, search });
  }

  @Get('gigs/mine')
  getMyGigs(@Request() req: any) {
    return this.workService.getMyGigs(req.user.userId);
  }

  @Get('gigs/freelancing/mine')
  getMyFreelanceWork(@Request() req: any) {
    return this.workService.getMyFreelanceWork(req.user.userId);
  }

  @Get('proposals/mine')
  getMyProposals(@Request() req: any) {
    return this.workService.getMyProposals(req.user.userId);
  }

  @Get('gigs/:id')
  getGig(@Param('id') id: string) {
    return this.workService.getGig(id);
  }

  @Post('gigs')
  createGig(@Request() req: any, @Body() body: any) {
    return this.workService.createGig(req.user.userId, body);
  }

  @Post('gigs/:id/cancel')
  cancelGig(@Request() req: any, @Param('id') id: string) {
    return this.workService.cancelGig(req.user.userId, id);
  }

  @Post('gigs/:id/propose')
  proposeForGig(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.workService.proposeForGig(req.user.userId, id, body);
  }

  @Get('gigs/:id/proposals')
  getGigProposals(@Request() req: any, @Param('id') id: string) {
    return this.workService.getGigProposals(req.user.userId, id);
  }

  @Post('proposals/:id/accept')
  acceptProposal(@Request() req: any, @Param('id') id: string) {
    return this.workService.acceptProposal(req.user.userId, id);
  }

  @Post('gigs/:id/submit')
  submitGigWork(@Request() req: any, @Param('id') id: string) {
    return this.workService.submitGigWork(req.user.userId, id);
  }

  @Post('gigs/:id/approve')
  approveGigCompletion(@Request() req: any, @Param('id') id: string) {
    return this.workService.approveGigCompletion(req.user.userId, id);
  }
}
