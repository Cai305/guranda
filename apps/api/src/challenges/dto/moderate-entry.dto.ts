import { IsIn } from 'class-validator';

export class ModerateEntryDto {
  @IsIn(['PUBLISHED', 'REMOVED'])
  status: string;
}
