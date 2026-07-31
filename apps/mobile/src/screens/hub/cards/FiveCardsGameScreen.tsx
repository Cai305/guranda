import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import io, { Socket } from 'socket.io-client';
import PlayingCard from '../../../components/cards/PlayingCard';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../../theme';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE_URL, fetchApi } from '../../../utils/api';
import {
  Card,
  FiveCardsState,
  newFiveCardsGame,
  drawFromDeck,
  takeDiscard,
  discard as discardFiveCards,
  possibleWinningSubsets,
} from '../../../games/cards/engine';
import { playFiveCardsAITurn } from '../../../games/cards/ai';

const TURN_SECONDS = 45;

function cardKey(c: Card | null): string {
  if (!c) return 'null';
  return c.isJoker ? `J${c.suit}` : `${c.suit}${c.rank}`;
}

export default function FiveCardsGameScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { gameId, offline, difficulty, jokersEnabled } = route.params ?? {};
  const [socket, setSocket] = useState<Socket | null>(null);
  const [game, setGame] = useState<any>(null);
  const [mySeat, setMySeat] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(TURN_SECONDS);
  const [wagerSettled, setWagerSettled] = useState(false);
  const displayName = user?.displayName || user?.username || 'Player';

  // ---- Offline practice mode ----
  useEffect(() => {
    if (!offline || !user) return;
    const state = newFiveCardsGame(
      [
        { userId: user.userId, isAI: false, displayName },
        { userId: null, isAI: true, displayName: 'Guranda Bot', difficulty: difficulty ?? 'medium' },
      ],
      !!jokersEnabled,
    );
    setGame({ mode: 'FIVE_CARDS', status: 'active', state, seats: state.seats.map((s: any) => ({ ...s, hand: undefined })) });
    setMySeat(0);
  }, [offline]);

  const applyOfflineAI = useCallback((state: FiveCardsState) => {
    if (state.winnerSeat !== null) return state;
    if (state.seats[1]?.isAI && state.currentSeat === 1) {
      return playFiveCardsAITurn(state, 1, state.seats[1].difficulty ?? 'medium');
    }
    return state;
  }, []);

  useEffect(() => {
    if (!offline || !game?.state) return;
    if (game.state.currentSeat === 1 && game.state.winnerSeat === null) {
      const timer = setTimeout(() => {
        setGame((g: any) => {
          const nextState = applyOfflineAI(g.state);
          return { ...g, state: nextState, status: nextState.winnerSeat !== null ? 'finished' : 'active' };
        });
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [offline, game?.state?.currentSeat, applyOfflineAI]);

  // ---- Online mode ----
  useEffect(() => {
    if (offline || !user) return;
    const sock = io(`${API_BASE_URL}/cards`);
    setSocket(sock);

    sock.on('connect', () => {
      sock.emit('join_game', { gameId, userId: user.userId });
    });
    sock.on('game_updated', (payload: any) => {
      setGame(payload);
      const seatIndex = (payload.seats as any[]).findIndex((s) => s.userId === user.userId);
      setMySeat(seatIndex === -1 ? null : seatIndex);
      setSecondsLeft(TURN_SECONDS);
    });
    sock.on('invalid_action', (data: { reason: string }) => {
      console.warn('invalid_action', data.reason);
    });
    sock.on('turn_timer_expired', () => setSecondsLeft(0));

    return () => { sock.disconnect(); };
  }, [offline, gameId]);

  useEffect(() => {
    if (offline) return;
    setSecondsLeft(TURN_SECONDS);
    const interval = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(interval);
  }, [game?.state?.currentSeat, game?.state?.turnPhase, offline]);

  const state: FiveCardsState | null = game?.state ?? null;
  const isMyTurn = mySeat !== null && state?.currentSeat === mySeat;
  const myHand: Card[] = (mySeat !== null && state?.seats[mySeat]?.hand) || [];
  const winningSubsets = isMyTurn && state?.turnPhase === 'discard' ? possibleWinningSubsets(myHand, !!state?.jokersEnabled) : [];
  const suggestedKeep = winningSubsets[0]?.map(cardKey) ?? null;

  const doDraw = () => {
    if (offline) {
      setGame((g: any) => ({ ...g, state: drawFromDeck(g.state, mySeat!).state }));
      return;
    }
    if (!user) return;
    socket?.emit('fivecards_draw', { gameId, userId: user.userId });
  };
  const doTakeDiscard = () => {
    if (offline) {
      setGame((g: any) => ({ ...g, state: takeDiscard(g.state, mySeat!).state }));
      return;
    }
    if (!user) return;
    socket?.emit('fivecards_take_discard', { gameId, userId: user.userId });
  };
  const doDiscard = (card: Card) => {
    if (offline) {
      setGame((g: any) => {
        const result = discardFiveCards(g.state, mySeat!, card);
        const nextState = result.state;
        return { ...g, state: nextState, status: nextState.winnerSeat !== null ? 'finished' : 'active' };
      });
      return;
    }
    if (!user) return;
    socket?.emit('fivecards_discard', { gameId, userId: user.userId, card });
  };

  const settleWager = async (won: boolean) => {
    if (offline || wagerSettled || !game?.wager) return;
    setWagerSettled(true);
    try {
      await fetchApi(`/cards/${gameId}/wager`, {
        method: 'POST',
        body: JSON.stringify({ action: won ? 'win' : 'stake', amount: game.wager }),
      });
    } catch {}
  };

  const finished = game?.status === 'finished' || state?.winnerSeat !== null;
  const iWon = finished && state?.winnerSeat === mySeat;
  useEffect(() => {
    if (finished && mySeat !== null && state?.winnerSeat !== undefined) settleWager(!!iWon);
  }, [finished]);

  if (!state) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: COLORS.textMuted }}>Loading game…</Text>
      </View>
    );
  }

  const opponentSeats = state.seats.filter((_: any, i: number) => i !== mySeat);
  const topDiscard = state.discardPile[0];

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h3}>5 Cards</Text>
        <View style={styles.timerPill}>
          <Ionicons name="time" size={14} color={isMyTurn ? COLORS.gold : COLORS.textMuted} />
          <Text style={[styles.timerText, isMyTurn && { color: COLORS.gold }]}>{secondsLeft}s</Text>
        </View>
      </View>

      <View style={styles.opponentsRow}>
        {opponentSeats.map((seat: any) => (
          <View key={seat.seatIndex} style={styles.opponentBlock}>
            <Text style={styles.opponentName} numberOfLines={1}>{seat.displayName}{seat.isAI ? ' 🤖' : ''}</Text>
            <View style={styles.miniHand}>
              {(seat.hand ?? []).map((_: any, i: number) => (
                <PlayingCard key={i} faceDown size="sm" style={{ marginLeft: i === 0 ? 0 : -20 }} />
              ))}
            </View>
            {state.currentSeat === seat.seatIndex && <View style={styles.turnDot} />}
          </View>
        ))}
      </View>

      <View style={styles.tableRow}>
        <TouchableOpacity
          style={styles.pileWrap}
          disabled={!isMyTurn || state.turnPhase !== 'draw' || state.deck.length === 0 && state.discardPile.length <= 1}
          onPress={doDraw}
        >
          <PlayingCard faceDown size="lg" />
          <Text style={styles.pileLabel}>Deck ({state.deck.length})</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pileWrap}
          disabled={!isMyTurn || state.turnPhase !== 'draw' || !topDiscard}
          onPress={doTakeDiscard}
        >
          {topDiscard ? <PlayingCard suit={topDiscard.suit} rank={topDiscard.rank} isJoker={topDiscard.isJoker} size="lg" /> : (
            <View style={[styles.emptyPile]} />
          )}
          <Text style={styles.pileLabel}>Discard</Text>
        </TouchableOpacity>
      </View>

      {isMyTurn && state.turnPhase === 'discard' && suggestedKeep && (
        <View style={styles.hintBanner}>
          <Ionicons name="sparkles" size={14} color={COLORS.gold} />
          <Text style={styles.hintText}>Winning hand available — discard the highlighted card!</Text>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.handRow}>
        {myHand.map((card, i) => {
          const isSuggestedDiscard = suggestedKeep ? !suggestedKeep.includes(cardKey(card)) : false;
          return (
            <PlayingCard
              key={i}
              suit={card.suit}
              rank={card.rank}
              isJoker={card.isJoker}
              size="lg"
              selected={isSuggestedDiscard}
              onPress={
                isMyTurn && state.turnPhase === 'discard' && !finished ? () => doDiscard(card) : undefined
              }
              style={{ marginLeft: i === 0 ? 0 : -18 }}
            />
          );
        })}
      </ScrollView>

      <Text style={styles.instructions}>
        {finished
          ? ''
          : !isMyTurn
            ? 'Waiting for opponent…'
            : state.turnPhase === 'draw'
              ? 'Draw from the deck or take the discard'
              : 'Tap a card to discard'}
      </Text>

      <Modal visible={finished} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Ionicons name={iWon ? 'trophy' : 'sad'} size={48} color={iWon ? COLORS.gold : COLORS.textMuted} />
            <Text style={styles.modalTitle}>{iWon ? 'You won!' : 'Game over'}</Text>
            <Text style={styles.modalSubtitle}>
              {state.seats[state.winnerSeat ?? 0]?.displayName} won with a {' '}
              {(() => {
                const winnerHand = state.seats[state.winnerSeat ?? 0]?.hand ?? [];
                return winnerHand.length === 5 ? 'winning hand' : '';
              })()}
            </Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.modalBtnText}>Back to Lobby</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  timerPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 5,
  },
  timerText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 12 },
  opponentsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: SPACING.sm },
  opponentBlock: { alignItems: 'center', gap: 4 },
  opponentName: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600', maxWidth: 100 },
  miniHand: { flexDirection: 'row' },
  turnDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.gold },
  tableRow: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.xl, paddingVertical: SPACING.lg },
  pileWrap: { alignItems: 'center', gap: 6 },
  pileLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  emptyPile: {
    width: 74, height: 104, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.glassBorder, borderStyle: 'dashed',
  },
  hintBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center',
    marginHorizontal: SPACING.lg, marginBottom: SPACING.sm,
    backgroundColor: 'rgba(251,191,36,0.1)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)',
    borderRadius: RADIUS.md, paddingVertical: 8,
  },
  hintText: { color: COLORS.gold, fontSize: 12, fontWeight: '700' },
  handRow: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, alignItems: 'flex-end', flexGrow: 1, justifyContent: 'center' },
  instructions: { textAlign: 'center', color: COLORS.textMuted, fontSize: 13, marginBottom: SPACING.lg },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  modalCard: {
    backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.lg, padding: SPACING.xl,
    alignItems: 'center', gap: 8, width: '80%', borderWidth: 1, borderColor: COLORS.glassBorder,
  },
  modalTitle: { ...TYPOGRAPHY.h2 },
  modalSubtitle: { color: COLORS.textMuted, textAlign: 'center', fontSize: 13 },
  modalBtn: { marginTop: SPACING.md, backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, paddingVertical: 12, paddingHorizontal: 24 },
  modalBtnText: { color: '#fff', fontWeight: '700' },
});
