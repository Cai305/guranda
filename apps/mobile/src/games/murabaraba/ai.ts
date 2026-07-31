// Murabaraba AI: depth-limited minimax with alpha-beta pruning.
// A shoot decision counts as part of the same ply as the move that earned it,
// so the search naturally values mill-making moves by their best follow-up.

import {
  Action, GameState, Player,
  applyAction, cowsOnBoard, isInMill, legalActions, MILLS,
} from './engine';

export type Difficulty = 'easy' | 'medium' | 'hard';

const DEPTH: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

const WIN = 100_000;

function evaluate(s: GameState, me: Player): number {
  const you = (1 - me) as Player;
  if (s.winner === me) return WIN;
  if (s.winner === you) return -WIN;
  if (s.draw) return 0;

  const myCows = cowsOnBoard(s, me) + s.cowsToPlace[me];
  const yourCows = cowsOnBoard(s, you) + s.cowsToPlace[you];

  let myMills = 0, yourMills = 0;
  let myTwo = 0, yourTwo = 0; // open 2-in-a-line threats
  for (const [a, b, c] of MILLS) {
    const cells = [s.board[a], s.board[b], s.board[c]];
    const mine = cells.filter(x => x === me).length;
    const yours = cells.filter(x => x === you).length;
    const empty = cells.filter(x => x === null).length;
    if (mine === 3) myMills++;
    else if (yours === 3) yourMills++;
    else if (mine === 2 && empty === 1) myTwo++;
    else if (yours === 2 && empty === 1) yourTwo++;
  }

  // Cows protected inside mills are worth a bit extra
  let myProtected = 0, yourProtected = 0;
  for (let i = 0; i < 24; i++) {
    if (s.board[i] === me && isInMill(s.board, i)) myProtected++;
    if (s.board[i] === you && isInMill(s.board, i)) yourProtected++;
  }

  return (
    (myCows - yourCows) * 120 +
    (myMills - yourMills) * 60 +
    (myTwo - yourTwo) * 25 +
    (myProtected - yourProtected) * 8
  );
}

function search(
  s: GameState, me: Player, depth: number, alpha: number, beta: number,
): number {
  if (s.winner !== null || s.draw || depth <= 0) return evaluate(s, me);

  const actions = legalActions(s);
  if (actions.length === 0) return evaluate(s, me);

  const maximizing = s.turn === me;
  let best = maximizing ? -Infinity : Infinity;

  for (const a of actions) {
    const next = applyAction(s, a);
    // A pending shot keeps the ply "open": don't burn depth on it
    const nextDepth = next.pendingShot && next.turn === s.turn ? depth : depth - 1;
    const score = search(next, me, nextDepth, alpha, beta);
    if (maximizing) {
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
    } else {
      best = Math.min(best, score);
      beta = Math.min(beta, score);
    }
    if (beta <= alpha) break;
  }
  return best;
}

/** Pick the AI's next action (place, move, or shoot). */
export function bestAction(s: GameState, difficulty: Difficulty): Action | null {
  const actions = legalActions(s);
  if (actions.length === 0) return null;

  const me = s.turn;
  const depth = DEPTH[difficulty];

  let bestScore = -Infinity;
  let candidates: Action[] = [];
  for (const a of actions) {
    const next = applyAction(s, a);
    const nextDepth = next.pendingShot && next.turn === me ? depth : depth - 1;
    const score = search(next, me, nextDepth, -Infinity, Infinity);
    if (score > bestScore) {
      bestScore = score;
      candidates = [a];
    } else if (score === bestScore) {
      candidates.push(a);
    }
  }

  // Easy AI blunders sometimes to stay friendly
  if (difficulty === 'easy' && Math.random() < 0.35) {
    return actions[Math.floor(Math.random() * actions.length)];
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}
