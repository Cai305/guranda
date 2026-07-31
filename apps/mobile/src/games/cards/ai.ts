// Convenience wrappers around @mxit2/types' AI heuristics for offline
// practice mode — a single "play the bot's whole turn" call per game,
// so lobby/game screens don't need to know the two-step draw/discard
// protocol the online gateway uses.
import {
  FiveCardsState,
  FiveCardsDifficulty,
  drawFromDeck,
  takeDiscard,
  discard as discardFiveCards,
  pickAIDrawAction,
  pickAIDiscard,
  CassinoState,
  CassinoDifficulty,
  capture as cassinoCapture,
  build as cassinoBuild,
  extendOrTakeOverBuild as cassinoExtendOrTakeOverBuild,
  trail as cassinoTrail,
  pickAIMove as pickCassinoAIMove,
} from './engine';

export function playFiveCardsAITurn(
  state: FiveCardsState,
  seatIndex: number,
  difficulty: FiveCardsDifficulty,
): FiveCardsState {
  const action = pickAIDrawAction(state, seatIndex, difficulty);
  const afterDraw = action === 'draw' ? drawFromDeck(state, seatIndex) : takeDiscard(state, seatIndex);
  if (afterDraw.error) return state;
  const discardCard = pickAIDiscard(afterDraw.state.seats[seatIndex].hand, afterDraw.state.jokersEnabled);
  const afterDiscard = discardFiveCards(afterDraw.state, seatIndex, discardCard);
  return afterDiscard.error ? afterDraw.state : afterDiscard.state;
}

export function playCassinoAITurn(
  state: CassinoState,
  seatIndex: number,
  difficulty: CassinoDifficulty,
): CassinoState {
  const move = pickCassinoAIMove(state, seatIndex, difficulty);
  let result;
  if (move.kind === 'capture') {
    result = cassinoCapture(state, seatIndex, move.card, move.targetIds);
  } else if (move.kind === 'build') {
    result = cassinoBuild(state, seatIndex, move.card, move.targetIds, move.buildValue ?? 0);
  } else if (move.kind === 'trail') {
    result = cassinoTrail(state, seatIndex, move.card);
  } else {
    result = cassinoExtendOrTakeOverBuild(state, seatIndex, move.buildId!, move.card, move.buildValue ?? 0);
  }
  return result.error ? state : result.state;
}
