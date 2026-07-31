// The canonical 5 Cards / Cassino rules engines live in @mxit2/types
// (packages/types/src/fiveCardsRules.ts, cassinoRules.ts) so the NestJS
// server can run them authoritatively for online play. This file
// re-exports them so local imports (PlayingCard usage, lobby/game screens,
// ai.ts) don't need to change, and so offline practice mode can run the
// exact same rules with zero network calls.
export * from '@mxit2/types';
