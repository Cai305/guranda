// ============================================================
// LifeOS Turbo Racing — endless-lane-runner sprint to a fixed
// finish distance. Shared by the NestJS server (matchmaking +
// real-time relay + persistence) and the mobile client (the
// actual car simulation, which is fully client-authoritative —
// see turbo-racing.gateway.ts for why that's the right trust
// model here, same as 8-Ball Pool's shot relay).
//
// Both racers in a race run the SAME procedurally generated
// track (same `seed`) so the race is fair without the server
// needing to simulate anything itself.
// ============================================================

export const LANE_COUNT = 3;
export const FINISH_DISTANCE = 3000; // meters

export type TrackItemType = 'obstacle' | 'coin' | 'boost';

export interface TrackItem {
  distance: number;
  lane: number;
  type: TrackItemType;
}

// Deterministic PRNG (mulberry32) — same seed always produces the
// same sequence, so every client generates an identical track.
function mulberry32(seed: number) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateTrack(seed: number, finishDistance: number = FINISH_DISTANCE): TrackItem[] {
  const rand = mulberry32(seed);
  const items: TrackItem[] = [];
  let d = 200; // clear runway before the first obstacle

  while (d < finishDistance - 100) {
    d += 30 + rand() * 40;

    // Never block every lane at the same marker — always leave an escape.
    const obstacleLanes = new Set<number>();
    const numObstacles = rand() < 0.15 ? 2 : rand() < 0.7 ? 1 : 0;
    while (obstacleLanes.size < Math.min(numObstacles, LANE_COUNT - 1)) {
      obstacleLanes.add(Math.floor(rand() * LANE_COUNT));
    }
    obstacleLanes.forEach(lane => items.push({ distance: Math.round(d), lane, type: 'obstacle' }));

    if (rand() < 0.55) {
      const freeLanes = Array.from({ length: LANE_COUNT }, (_, i) => i).filter(l => !obstacleLanes.has(l));
      if (freeLanes.length > 0) {
        const lane = freeLanes[Math.floor(rand() * freeLanes.length)];
        const type: TrackItemType = rand() < 0.12 ? 'boost' : 'coin';
        items.push({ distance: Math.round(d), lane, type });
      }
    }
  }

  return items.sort((a, b) => a.distance - b.distance);
}

// ── Car upgrades (bought with MSH from the wallet) ─────────────────────────

export type UpgradeStat = 'speed' | 'acceleration' | 'handling';
export const MAX_UPGRADE_LEVEL = 5;

// Cost to buy the level at this index (index 0 unused — you start there for free).
export const UPGRADE_COST = [0, 50, 100, 175, 275, 400];

export const BASE_TOP_SPEED = 70;   // m/s at level 0
export const BASE_ACCEL = 45;       // m/s^2 at level 0
export const BASE_HANDLING = 3.2;   // lane-changes per second at level 0

export function topSpeedFor(level: number): number {
  return BASE_TOP_SPEED + level * 6;
}
export function accelFor(level: number): number {
  return BASE_ACCEL + level * 8;
}
export function handlingFor(level: number): number {
  return BASE_HANDLING + level * 0.35;
}
export function costForLevel(level: number): number {
  return UPGRADE_COST[level] ?? Infinity;
}

// The "speed" upgrade is presented as a named engine swap rather than a bare
// number — every car starts as a plain 1.0 TSI Turbo and works its way up to
// a real F1 power unit. Index = speedLevel.
export const ENGINE_NAMES = [
  '1.0 TSI Turbo',
  '1.4 TSI Turbo',
  '2.0 TSI Turbo',
  '3.0 V6 Twin-Turbo',
  '4.0 V8 Turbo',
  '1.6L V6 Hybrid F1 Power Unit',
];

export function engineNameFor(level: number): string {
  return ENGINE_NAMES[Math.max(0, Math.min(ENGINE_NAMES.length - 1, level))];
}

// Livery paint — purely cosmetic, free to switch any time. Every car is the
// same F1 chassis; only the paint differs.
export const CAR_COLORS = [
  '#DC2626', // red
  '#2563EB', // blue
  '#16A34A', // green
  '#F59E0B', // amber
  '#7C3AED', // purple
  '#0EA5E9', // sky
  '#FFFFFF', // white
  '#111827', // black
];
export const DEFAULT_CAR_COLOR = CAR_COLORS[0];

export interface CarUpgrades {
  speedLevel: number;
  accelLevel: number;
  handlingLevel: number;
  color: string;
}

// ── Online race DTOs ────────────────────────────────────────────────────────

export interface TurboRacingSeatDto {
  seatIndex: number;
  userId: string;
  displayName: string;
  color: string;
  distance: number;
  lane: number;
  crashed: boolean;
  coins: number;
  rank: number | null;
  finishedAt: string | Date | null;
}

export interface TurboRacingRaceDto {
  id: string;
  seed: number;
  finishDistance: number;
  seats: TurboRacingSeatDto[];
  status: 'active' | 'finished';
  createdById: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface TurboRacingJoinQueuePayload {
  userId: string;
  displayName: string;
}

export interface TurboRacingProgressPayload {
  raceId: string;
  userId: string;
  distance: number;
  lane: number;
  crashed: boolean;
  coins: number;
}

// Placement bonus (MSH) on top of 1:1 coins-to-MSH at race end.
export const PLACEMENT_BONUS = [20, 5];
