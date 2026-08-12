import { IsArray, IsEnum, IsObject, IsOptional } from 'class-validator';
import { AccountType } from '@prisma/client';

// Deliberately loose here (arrays/objects, not deep @ValidateNested class
// trees — this codebase doesn't use class-transformer's nested validation
// pattern anywhere yet, see ChallengesController's plain `{ mshAmount:
// number }` body types for the same style). BusinessInsightsService does its
// own numeric sanitization (Number.isFinite + clamping) on every field
// before it ever reaches a Prisma write or an LLM prompt, the same
// defense-in-depth ChallengeGeneratorService applies to LLM *output* — here
// it's applied to client *input* instead, since this endpoint's whole job is
// turning already-real numbers into prose without a single invented one.

export interface AppRevenueEntry {
  id: string;
  label: string;
  revenue: number;
}

export interface SocialStatsInput {
  postCount: number;
  likesReceived: number;
  commentsReceived: number;
}

export interface VideoStatsInput {
  videoCount: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  giftsReceived: number;
}

export interface StoryStatsInput {
  storyCount: number;
  likesReceived: number;
  commentsReceived: number;
  ranksReceived: number;
  giftsReceived: number;
}

export interface GiftStatsInput {
  totalReceived: number;
  totalSent: number;
}

export class NarrateBusinessInsightsDto {
  // One entry per installed "Manage My Apps" mini app that has a defined
  // `revenue` from MiniAppManageSummary — i.e. exactly the numbers
  // DashboardScreen already fetched via MINI_APP_MANAGE_REGISTRY, passed
  // through rather than recomputed.
  @IsArray()
  apps: AppRevenueEntry[];

  @IsOptional()
  @IsObject()
  social?: SocialStatsInput;

  @IsOptional()
  @IsObject()
  video?: VideoStatsInput;

  @IsOptional()
  @IsObject()
  story?: StoryStatsInput;

  @IsOptional()
  @IsObject()
  gifts?: GiftStatsInput;
}

export class SetAccountTypeDto {
  // Omitted entirely (not just falsy) clears the override back to "derived"
  // — see BusinessInsightsController.setAccountTypeOverride.
  @IsOptional()
  @IsEnum(AccountType)
  accountType?: AccountType;
}
