// The canonical Murabaraba rules engine now lives in @mxit2/types
// (packages/types/src/morabarabaRules.ts) so the NestJS server can run
// it authoritatively for online play. This file re-exports it so local
// imports (ai.ts, MurabarabaBoard.tsx, MurabarabaGameScreen.tsx) don't
// need to change.
export * from '@mxit2/types';
