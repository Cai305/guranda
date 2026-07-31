import { IsIn } from 'class-validator';

export class VoteDto {
  @IsIn(['APPROVE', 'REJECT'])
  choice: 'APPROVE' | 'REJECT';
}
