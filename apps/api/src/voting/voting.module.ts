import { Module } from '@nestjs/common';
import { VotingController } from './voting.controller';
import { VotingService } from './voting.service';
import { TallyService } from './tally.service';
import { XrplService } from '../finance/xrpl.service';
import { VerificationModule } from '../verification/verification.module';

@Module({
  imports: [VerificationModule],
  controllers: [VotingController],
  providers: [VotingService, TallyService, XrplService],
  exports: [VotingService],
})
export class VotingModule {}
