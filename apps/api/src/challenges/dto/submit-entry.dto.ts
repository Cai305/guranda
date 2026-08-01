import { IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class SubmitEntryDto {
  @IsUrl({ require_tld: false })
  mediaUrl: string;

  @IsIn(['IMAGE', 'VIDEO', 'AUDIO'])
  mediaType: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;
}
