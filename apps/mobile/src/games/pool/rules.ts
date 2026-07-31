// 8-Ball rules engine. Works on top of the physics module: after each shot
// resolves, feed the ShotEvents in and get the next game state.

import { Ball, ShotEvents } from './physics';

export type Group = 'solids' | 'stripes';
export type PoolPlayer = 0 | 1;

export interface PoolState {
  turn: PoolPlayer;
  groups: [Group | null, Group | null]; // assigned after first legal pot on open table
  openTable: boolean;
  winner: PoolPlayer | null;
  winReason: string;
  message: string;                      // last turn summary for the HUD
  shotsTaken: number;
}

export function newPoolState(): PoolState {
  return {
    turn: 0,
    groups: [null, null],
    openTable: true,
    winner: null,
    winReason: '',
    message: 'Break!',
    shotsTaken: 0,
  };
}

const isSolid = (id: number) => id >= 1 && id <= 7;
const isStripe = (id: number) => id >= 9 && id <= 15;

export function groupOf(id: number): Group | null {
  if (isSolid(id)) return 'solids';
  if (isStripe(id)) return 'stripes';
  return null;
}

export function ballsLeft(balls: Ball[], group: Group): number {
  return balls.filter(
    b => !b.potted && (group === 'solids' ? isSolid(b.id) : isStripe(b.id)),
  ).length;
}

/** May this player legally target the 8-ball? */
export function onEight(balls: Ball[], state: PoolState, player: PoolPlayer): boolean {
  const g = state.groups[player];
  return g !== null && ballsLeft(balls, g) === 0;
}

/**
 * Apply the outcome of a resolved shot. Returns the updated state plus
 * whether the cue ball needs respotting.
 */
export function applyShot(state: PoolState, balls: Ball[], ev: ShotEvents): {
  state: PoolState;
  respot: boolean;
} {
  const s: PoolState = { ...state, groups: [...state.groups] as [Group | null, Group | null] };
  const me = s.turn;
  const opp = (1 - me) as PoolPlayer;
  s.shotsTaken++;

  const eightPotted = ev.potted.includes(8);
  const wasOnEight = onEight(balls, state, me);

  // ── 8-ball outcomes decide the game immediately ──
  if (eightPotted) {
    if (!wasOnEight) {
      s.winner = opp;
      s.winReason = 'The 8-ball dropped too early';
    } else if (ev.cueScratched) {
      s.winner = opp;
      s.winReason = 'Scratched while potting the 8-ball';
    } else {
      s.winner = me;
      s.winReason = 'Cleared the table and sank the 8-ball';
    }
    s.message = s.winReason;
    return { state: s, respot: false };
  }

  // ── Fouls ──
  let foul = false;
  let foulWhy = '';

  if (ev.cueScratched) {
    foul = true;
    foulWhy = 'Scratch! Cue ball potted';
  } else if (ev.firstHit === null) {
    foul = true;
    foulWhy = 'Foul — nothing was hit';
  } else if (!s.openTable) {
    const myGroup = s.groups[me];
    const hitGroup = groupOf(ev.firstHit);
    const legalEight = wasOnEight && ev.firstHit === 8;
    if (myGroup && hitGroup !== myGroup && !legalEight) {
      foul = true;
      foulWhy = `Foul — hit ${ev.firstHit === 8 ? 'the 8-ball' : hitGroup} first`;
    }
  }

  // ── Group assignment on open table ──
  const pottedGroups = ev.potted.map(groupOf).filter((g): g is Group => g !== null);
  if (s.openTable && !foul && pottedGroups.length > 0) {
    s.groups[me] = pottedGroups[0];
    s.groups[opp] = pottedGroups[0] === 'solids' ? 'stripes' : 'solids';
    s.openTable = false;
  }

  // ── Turn resolution ──
  if (foul) {
    s.turn = opp;
    s.message = `${foulWhy} — ball in hand`;
    return { state: s, respot: true };
  }

  const myGroup = s.groups[me];
  const pottedOwn =
    pottedGroups.length > 0 && (myGroup === null || pottedGroups.includes(myGroup));

  if (pottedOwn) {
    s.message = 'Nice pot — shoot again';
    // same player continues
  } else {
    s.turn = opp;
    s.message = ev.potted.length > 0 ? 'Potted the wrong ball — turn over' : 'No pot — turn over';
  }
  return { state: s, respot: false };
}
