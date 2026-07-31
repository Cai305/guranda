// Turbo Racing client simulation — runs identically on every racer's own
// device (deterministic given the same track + upgrades), so there's
// nothing for the server to simulate; it just relays each racer's
// self-reported {distance, lane, crashed, coins} to the other racer.
import {
  TrackItem, LANE_COUNT, CarUpgrades, topSpeedFor, accelFor, handlingFor,
} from '@mxit2/types';

export interface SimState {
  distance: number;
  lanePos: number;   // continuous 0..(LANE_COUNT-1)
  laneTarget: number; // integer target lane
  speed: number;
  crashTimer: number; // seconds remaining of post-crash slowdown
  boostTimer: number; // seconds remaining of boost
  coins: number;
  consumed: Set<number>; // indices into the track array already triggered
  finished: boolean;
}

export function newSimState(): SimState {
  return {
    distance: 0,
    lanePos: 1,
    laneTarget: 1,
    speed: 0,
    crashTimer: 0,
    boostTimer: 0,
    coins: 0,
    consumed: new Set(),
    finished: false,
  };
}

export function setLaneTarget(state: SimState, delta: -1 | 1) {
  state.laneTarget = Math.max(0, Math.min(LANE_COUNT - 1, state.laneTarget + delta));
}

const CRASH_SLOWDOWN = 0.35;
const CRASH_DURATION = 1.1;
const BOOST_MULTIPLIER = 1.55;
const BOOST_DURATION = 2.6;
const LANE_HIT_RADIUS = 0.55;

// Advances the simulation by `dt` seconds. Mutates and returns `state`.
export function stepSim(
  state: SimState,
  dt: number,
  upgrades: CarUpgrades,
  track: TrackItem[],
  finishDistance: number,
): SimState {
  if (state.finished) return state;

  const topSpeed = topSpeedFor(upgrades.speedLevel);
  const accel = accelFor(upgrades.accelLevel);
  const handling = handlingFor(upgrades.handlingLevel);

  if (state.crashTimer > 0) state.crashTimer = Math.max(0, state.crashTimer - dt);
  if (state.boostTimer > 0) state.boostTimer = Math.max(0, state.boostTimer - dt);

  const targetSpeed = state.crashTimer > 0
    ? topSpeed * CRASH_SLOWDOWN
    : state.boostTimer > 0
      ? topSpeed * BOOST_MULTIPLIER
      : topSpeed;

  if (state.speed < targetSpeed) {
    state.speed = Math.min(targetSpeed, state.speed + accel * dt);
  } else {
    state.speed = Math.max(targetSpeed, state.speed - accel * 1.5 * dt);
  }

  // Lane position eases toward the target lane at `handling` lanes/second.
  const laneDelta = state.laneTarget - state.lanePos;
  const laneStep = handling * dt;
  if (Math.abs(laneDelta) <= laneStep) {
    state.lanePos = state.laneTarget;
  } else {
    state.lanePos += Math.sign(laneDelta) * laneStep;
  }

  const prevDistance = state.distance;
  state.distance = Math.min(finishDistance, prevDistance + state.speed * dt);

  track.forEach((item, i) => {
    if (state.consumed.has(i)) return;
    if (item.distance < prevDistance || item.distance > state.distance) return;
    state.consumed.add(i);
    if (Math.abs(item.lane - state.lanePos) > LANE_HIT_RADIUS) return; // dodged

    if (item.type === 'obstacle') {
      state.crashTimer = CRASH_DURATION;
      state.speed *= CRASH_SLOWDOWN;
    } else if (item.type === 'coin') {
      state.coins += 1;
    } else if (item.type === 'boost') {
      state.boostTimer = BOOST_DURATION;
    }
  });

  if (state.distance >= finishDistance) {
    state.finished = true;
  }

  return state;
}
