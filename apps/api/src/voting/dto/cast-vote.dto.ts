import { IsObject } from 'class-validator';

// Structural shape depends on the position's votingType — validated in
// VotingService against the actual candidates/seats/voting weight, since
// that needs a DB lookup class-validator can't express on its own.
export class CastVoteDto {
  @IsObject()
  selection: Record<string, any>;
}
