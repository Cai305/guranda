import * as fs from 'fs';
import * as path from 'path';

// Loaded once at process start. `dictionary` is the full ENABLE1 word list
// (public domain, standard for word games) used to validate Boggle and
// Scrabble words. `wordleAnswers` is a curated pool of common 5-letter
// words for secret-word selection; `wordleGuesses` is every valid
// 5-letter word a player is allowed to type as a guess.
const dataDir = path.join(__dirname, '../data');

function load<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
}

export const dictionary: Set<string> = new Set(
  load<string[]>('dictionary.json'),
);
export const wordleAnswers: string[] = load<string[]>('wordleAnswers.json');
export const wordleGuessSet: Set<string> = new Set(
  load<string[]>('wordleGuesses.json'),
);

export function isValidWord(word: string): boolean {
  return dictionary.has(word.toUpperCase());
}
