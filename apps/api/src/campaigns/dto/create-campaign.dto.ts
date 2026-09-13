import {
  IsDateString, IsEnum, IsInt, IsNumber, IsObject, IsOptional,
  IsString, Min, MaxLength, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CampaignType } from '@prisma/client';

class ActionRouteDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsObject()
  params?: Record<string, unknown>;
}

export class CreateCampaignDto {
  @IsEnum(CampaignType)
  type: CampaignType;

  @IsString()
  @MaxLength(150)
  title: string;

  @IsString()
  @MaxLength(2000)
  description: string;

  @IsString()
  @MaxLength(50)
  goal: string;

  @IsString()
  @MaxLength(100)
  rewardLabel: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedMinutes?: number;

  @IsString()
  @MaxLength(30)
  actionLabel: string;

  @ValidateNested()
  @Type(() => ActionRouteDto)
  actionRoute: ActionRouteDto;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  // Only meaningful for BUSINESS / MINI_APP_LAUNCH — validated as
  // "> 0 required" in the service for those types, not here, since the
  // requirement is conditional on `type`.
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsString()
  targetMinReputationLevel?: string;

  @IsOptional()
  @IsString({ each: true })
  targetCategories?: string[];

  // Phase 7 — Franchise tenancy. Omitted/undefined = the existing global
  // business-wide campaign behaviour, completely unchanged. Set = this
  // campaign is scoped to ONE franchise-location Username (e.g. "KFC
  // Makhado" vs the global "KFC" campaign) — validated in
  // CampaignsService.create() via FranchisesService.canActAsAlias.
  @IsOptional()
  @IsString()
  franchiseUsernameId?: string;

  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;
}
