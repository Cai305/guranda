import { Injectable } from '@nestjs/common';

export type ReputationLevel =
  | 'Nano'
  | 'Micro'
  | 'Midtier'
  | 'Macro'
  | 'Mega Influencer';

// Distance-BAND proxies (Haversine radius from the author), not real
// administrative polygon lookups — there's no reverse-geocoding integration
// in this repo. Nano/Micro map to the user's own literal constants
// (innerCircleRadius/cityCircleRadius); Midtier/Macro are reasonable
// province/country-sized proxies, easy to retune later; Mega Influencer is
// worldwide (no cap).
export const REACH_RADIUS_KM: Record<ReputationLevel, number | null> = {
  Nano: 50,
  Micro: 100,
  Midtier: 400,
  Macro: 1500,
  'Mega Influencer': null,
};

const WEIGHTS = { recency: 0.4, reputation: 0.3, proximity: 0.3 };
const PROXIMITY_FLOOR = 0.15; // out-of-reach content ranks low, never fully hidden
const REPUTATION_NORM_CAP = 100000;
const DEFAULT_HALF_LIFE_HOURS = 36;

export interface ScoreItemInput {
  createdAt: Date;
  authorReputationScore: number;
  authorLevel: ReputationLevel;
  authorLat?: number | null;
  authorLng?: number | null;
  viewerLat?: number | null;
  viewerLng?: number | null;
  halfLifeHours?: number;
}

// Shared by Posts, Video, Live discovery, and Ads — one scoring function,
// each feed just supplies its own items + a thin mapping into ScoreItemInput.
@Injectable()
export class ContentRankingService {
  haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  scoreItem(input: ScoreItemInput): number {
    const ageHours = Math.max(
      0,
      (Date.now() - input.createdAt.getTime()) / 3600000,
    );
    const recency = Math.exp(
      -ageHours / (input.halfLifeHours ?? DEFAULT_HALF_LIFE_HOURS),
    );
    const repNorm = Math.min(
      1,
      Math.log10(Math.max(0, input.authorReputationScore) + 10) /
        Math.log10(REPUTATION_NORM_CAP),
    );

    let proximity = 0.5; // neutral when either party's location is unknown
    if (
      input.authorLat != null &&
      input.authorLng != null &&
      input.viewerLat != null &&
      input.viewerLng != null
    ) {
      const dist = this.haversineKm(
        input.viewerLat,
        input.viewerLng,
        input.authorLat,
        input.authorLng,
      );
      const radius = REACH_RADIUS_KM[input.authorLevel];
      proximity =
        radius == null || dist <= radius
          ? 1
          : Math.max(PROXIMITY_FLOOR, Math.exp(-(dist - radius) / radius));
    }

    return (
      WEIGHTS.recency * recency +
      WEIGHTS.reputation * repNorm +
      WEIGHTS.proximity * proximity
    );
  }

  rank<T>(items: T[], scorer: (item: T) => number, take?: number): T[] {
    const scored = items
      .map((item) => ({ item, score: scorer(item) }))
      .sort((a, b) => b.score - a.score);
    return (take ? scored.slice(0, take) : scored).map((s) => s.item);
  }
}
