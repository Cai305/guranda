import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DepositAdminNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNote?: string;
}
