import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AnnouncementContext } from '@prisma/client';

export class CreateAnnouncementDto {
  @IsEnum(AnnouncementContext)
  contextType: AnnouncementContext;

  @IsString()
  @MaxLength(100)
  contextKey: string;

  @IsString()
  @MaxLength(150)
  title: string;

  @IsString()
  @MaxLength(1000)
  body: string;

  @IsOptional()
  @IsString()
  iconUrl?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
