import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { VotingService } from './voting.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CreateStructureDto } from './dto/create-structure.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateElectionDto } from './dto/create-election.dto';
import { CreatePositionDto } from './dto/create-position.dto';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { CheckInDto } from './dto/checkin.dto';
import { CastVoteDto } from './dto/cast-vote.dto';

@Controller('voting')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class VotingController {
  constructor(private readonly voting: VotingService) {}

  @Post('structures')
  createStructure(@Request() req: any, @Body() body: CreateStructureDto) {
    return this.voting.createStructure(req.user.userId, body);
  }

  @Get('structures/mine')
  myStructures(@Request() req: any) {
    return this.voting.myStructures(req.user.userId);
  }

  @Get('structures/:id')
  getStructure(@Request() req: any, @Param('id') id: string) {
    return this.voting.getStructure(id, req.user.userId);
  }

  @Post('structures/:id/members')
  addMember(@Request() req: any, @Param('id') id: string, @Body() body: AddMemberDto) {
    return this.voting.addMember(id, req.user.userId, body);
  }

  @Post('structures/:id/elections')
  createElection(@Request() req: any, @Param('id') id: string, @Body() body: CreateElectionDto) {
    return this.voting.createElection(id, req.user.userId, body);
  }

  @Post('elections/:id/positions')
  createPosition(@Request() req: any, @Param('id') id: string, @Body() body: CreatePositionDto) {
    return this.voting.createPosition(id, req.user.userId, body);
  }

  @Post('positions/:id/candidates')
  createCandidate(@Request() req: any, @Param('id') id: string, @Body() body: CreateCandidateDto) {
    return this.voting.createCandidate(id, req.user.userId, body);
  }

  @Get('elections/:id')
  getElection(@Request() req: any, @Param('id') id: string) {
    return this.voting.getElection(id, req.user.userId);
  }

  @Post('elections/:id/checkin')
  checkIn(@Request() req: any, @Param('id') id: string, @Body() body: CheckInDto) {
    return this.voting.checkIn(id, req.user.userId, body.method);
  }

  @Post('positions/:id/vote')
  castVote(@Request() req: any, @Param('id') id: string, @Body() body: CastVoteDto) {
    return this.voting.castVote(id, req.user.userId, body.selection);
  }

  @Get('positions/:id/results')
  getResults(@Param('id') id: string) {
    return this.voting.getResults(id);
  }
}
