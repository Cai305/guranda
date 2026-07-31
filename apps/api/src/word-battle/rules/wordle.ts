import {
  LetterState,
  WordleStateDto,
  WordBattleDifficulty,
} from '@mxit2/types';
import { wordleAnswers, wordleGuessSet } from './dictionary';

const MAX_GUESSES = 6;

// Server-only state — includes the secret word, which must never be sent
// to a client until both seats have finished.
export interface WordleInternalState extends WordleStateDto {
  secret: string;
}

export function pickSecretWord(): string {
  return wordleAnswers[Math.floor(Math.random() * wordleAnswers.length)];
}

export function isValidGuess(word: string): boolean {
  return wordleGuessSet.has(word.toUpperCase());
}

export function evaluateGuess(secret: string, guess: string): LetterState[] {
  const s = secret.toUpperCase().split('');
  const g = guess.toUpperCase().split('');
  const result: LetterState[] = new Array(g.length).fill('absent');
  const used = new Array(s.length).fill(false);

  for (let i = 0; i < g.length; i++) {
    if (g[i] === s[i]) {
      result[i] = 'correct';
      used[i] = true;
    }
  }
  for (let i = 0; i < g.length; i++) {
    if (result[i] === 'correct') continue;
    const idx = s.findIndex((ch, j) => ch === g[i] && !used[j]);
    if (idx !== -1) {
      result[i] = 'present';
      used[idx] = true;
    }
  }
  return result;
}

export function createInitialState(): WordleInternalState {
  const secret = pickSecretWord();
  return {
    secret,
    wordLength: secret.length,
    maxGuesses: MAX_GUESSES,
    guesses: [],
    finishedSeats: [],
    solvedSeats: [],
  };
}

export function applyGuess(
  state: WordleInternalState,
  seatIndex: number,
  rawGuess: string,
): { state: WordleInternalState; error?: string } {
  const guess = rawGuess.trim().toUpperCase();
  if (state.finishedSeats.includes(seatIndex)) {
    return { state, error: 'You have already finished this round' };
  }
  if (guess.length !== state.wordLength) {
    return { state, error: `Guess must be ${state.wordLength} letters` };
  }
  if (!isValidGuess(guess)) {
    return { state, error: 'Not a recognised word' };
  }
  const seatGuessCount = state.guesses.filter(
    (g) => g.seatIndex === seatIndex,
  ).length;
  if (seatGuessCount >= state.maxGuesses) {
    return { state, error: 'No guesses left' };
  }

  const letters = evaluateGuess(state.secret, guess);
  const solved = letters.every((l) => l === 'correct');
  const guessesUsedNow = seatGuessCount + 1;

  const finishedSeats = [...state.finishedSeats];
  const solvedSeats = [...state.solvedSeats];
  if (solved) {
    solvedSeats.push(seatIndex);
    finishedSeats.push(seatIndex);
  } else if (guessesUsedNow >= state.maxGuesses) {
    finishedSeats.push(seatIndex);
  }

  return {
    state: {
      ...state,
      guesses: [...state.guesses, { seatIndex, word: guess, letters }],
      finishedSeats,
      solvedSeats,
    },
  };
}

// Both seats must be finished (solved or out of guesses) for the round to end.
export function isRoundOver(
  state: WordleInternalState,
  seatCount: number,
): boolean {
  return state.finishedSeats.length >= seatCount;
}

// Winner is whoever solved in fewer guesses; if only one solved, they win;
// if both solved in the same number of guesses, whoever solved first wins;
// if neither solved, it's a draw (null).
export function determineWinner(state: WordleInternalState): number | null {
  if (state.solvedSeats.length === 0) return null;
  if (state.solvedSeats.length === 1) return state.solvedSeats[0];

  const guessesToSolve = (seat: number) => {
    let count = 0;
    for (const g of state.guesses) {
      if (g.seatIndex === seat) {
        count++;
        if (g.letters.every((l) => l === 'correct')) return count;
      }
    }
    return Infinity;
  };
  const [a, b] = state.solvedSeats;
  const ga = guessesToSolve(a);
  const gb = guessesToSolve(b);
  if (ga === gb) {
    // whoever's solving guess appears earlier in the overall guess log
    for (const g of state.guesses) {
      if (g.letters.every((l) => l === 'correct')) return g.seatIndex;
    }
  }
  return ga < gb ? a : b;
}

// Constraint-filtering AI guesser — standard Wordle-solver approach:
// keep only candidate answers consistent with every piece of feedback
// the AI itself has received so far, then pick among the survivors.
export function chooseAIGuess(
  state: WordleInternalState,
  aiSeat: number,
  difficulty: WordBattleDifficulty,
): string {
  const ownGuesses = state.guesses.filter((g) => g.seatIndex === aiSeat);

  if (difficulty === 'easy' && Math.random() < 0.4) {
    return wordleAnswers[Math.floor(Math.random() * wordleAnswers.length)];
  }

  let candidates = wordleAnswers;
  for (const g of ownGuesses) {
    candidates = candidates.filter(
      (w) =>
        JSON.stringify(evaluateGuess(w, g.word)) === JSON.stringify(g.letters),
    );
  }
  if (candidates.length === 0) candidates = wordleAnswers;

  if (difficulty === 'hard') return candidates[0];
  const pool = candidates.slice(
    0,
    Math.max(10, Math.floor(candidates.length / 2)),
  );
  return pool[Math.floor(Math.random() * pool.length)];
}

// Strips the secret word from state for transmission to clients —
// revealed only once the round has actually ended.
export function sanitizeWordleState(
  state: WordleInternalState,
  roundOver: boolean,
): WordleStateDto {
  const { secret, ...rest } = state;
  return roundOver ? { ...rest, revealWord: secret } : rest;
}
