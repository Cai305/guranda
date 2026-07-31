import React, { useEffect, useMemo, useState } from 'react';
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
  CassinoState,
  CassinoMove,
  newMatch,
  legalMoves,
  capture as cassinoCapture,
  build as cassinoBuild,
  extendOrTakeOverBuild as cassinoExtendOrTakeOverBuild,
  trail as cassinoTrail,
} from '../../../games/cards/engine';
import { playCassinoAITurn } from '../../../games/cards/ai';

function cardKey(c: Card): string {
  return `${c.suit}${c.rank}`;
}
function sameIds(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x));
}

export default function CassinoGameScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { gameId, offline, difficulty, targetScore } = route.params ?? {};
  const [socket, setSocket] = useState<Socket | null>(null);
  const [game, setGame] = useState<any>(null);
  const [mySeat, setMySeat] = useState<number | null>(null);
  const [armedCard, setArmedCard] = useState<Card | null>(null);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [wagerSettled, setWagerSettled] = useState(false);
  const displayName = user?.displayName || user?.username || 'Player';

  // ---- Offline practice ----
  useEffect(() => {
    if (!offline || !user) return;
    const state = newMatch(
      [
        { userId: user.userId, isAI: false, displayName },
        { userId: null, isAI: true, displayName: 'Guranda Bot', difficulty: difficulty ?? 'medium' },
      ],
      'ONE_V_ONE',
      targetScore ?? 11,
    );
    setGame({ mode: 'CASSINO', status: 'active', state });
    setMySeat(0);
  }, [offline]);

  useEffect(() => {
    if (!offline || !game?.state) return;
    if (game.state.currentSeat === 1 && game.state.status === 'active') {
      const timer = setTimeout(() => {
        setGame((g: any) => {
          const nextState = playCassinoAITurn(g.state, 1, g.state.seats[1].difficulty ?? 'medium');
          return { ...g, state: nextState, status: nextState.status };
        });
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [offline, game?.state?.currentSeat, game?.state?.round]);

  // ---- Online ----
  useEffect(() => {
    if (offline || !user) return;
    const sock = io(`${API_BASE_URL}/cards`);
    setSocket(sock);
    sock.on('connect', () => sock.emit('join_game', { gameId, userId: user.userId }));
    sock.on('game_updated', (payload: any) => {
      setGame(payload);
      const seatIndex = (payload.seats as any[]).findIndex((s) => s.userId === user.userId);
      setMySeat(seatIndex === -1 ? null : seatIndex);
      setArmedCard(null);
      setSelectedTargets([]);
    });
    sock.on('invalid_action', (data: { reason: string }) => console.warn('invalid_action', data.reason));
    return () => { sock.disconnect(); };
  }, [offline, gameId]);

  const state: CassinoState | null = game?.state ?? null;
  const isMyTurn = mySeat !== null && state?.currentSeat === mySeat;
  const myHand: Card[] = (mySeat !== null && state?.seats[mySeat]?.hand) || [];

  const myLegalMoves: CassinoMove[] = useMemo(() => {
    if (!state || mySeat === null || !isMyTurn) return [];
    return legalMoves(state, mySeat);
  }, [state, mySeat, isMyTurn]);

  const candidateMoves = useMemo(() => {
    if (!armedCard) return [];
    return myLegalMoves.filter((m) => cardKey(m.card) === cardKey(armedCard) && sameIds(m.targetIds, selectedTargets));
  }, [myLegalMoves, armedCard, selectedTargets]);

  const captureMove = candidateMoves.find((m) => m.kind === 'capture');
  const buildMove = candidateMoves.find((m) => m.kind === 'build');
  const extendMove = candidateMoves.find((m) => m.kind === 'extendBuild' || m.kind === 'takeOverBuild');
  const trailAvailable = armedCard && selectedTargets.length === 0 && myLegalMoves.some((m) => m.kind === 'trail' && cardKey(m.card) === cardKey(armedCard));

  const toggleTarget = (id: string) => {
    setSelectedTargets((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const runMove = (move: CassinoMove) => {
    if (mySeat === null) return;
    if (offline) {
      setGame((g: any) => {
        let result;
        if (move.kind === 'capture') result = cassinoCapture(g.state, mySeat, move.card, move.targetIds);
        else if (move.kind === 'build') result = cassinoBuild(g.state, mySeat, move.card, move.targetIds, move.buildValue ?? 0);
        else if (move.kind === 'trail') result = cassinoTrail(g.state, mySeat, move.card);
        else result = cassinoExtendOrTakeOverBuild(g.state, mySeat, move.buildId!, move.card, move.buildValue ?? 0);
        return result.error ? g : { ...g, state: result.state, status: result.state.status };
      });
    } else if (user) {
      socket?.emit('cassino_play', {
        gameId,
        userId: user.userId,
        card: move.card,
        action: move.kind,
        targetIds: move.targetIds,
        buildValue: move.buildValue,
      });
    }
    setArmedCard(null);
    setSelectedTargets([]);
  };

  const finished = game?.status === 'finished' || state?.status === 'finished';
  const iWon = finished && (state?.winnerSeat === mySeat || (mySeat !== null && state?.winnerTeam === state?.seats[mySeat]?.team));

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
  useEffect(() => {
    if (finished) settleWager(!!iWon);
  }, [finished]);

  if (!state) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: COLORS.textMuted }}>Loading game…</Text>
      </View>
    );
  }

  const opponentSeats = state.seats.filter((_: any, i: number) => i !== mySeat);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h3}>Cassino</Text>
        <Text style={styles.scoreText}>Target {state.targetScore}</Text>
      </View>

      <View style={styles.opponentsRow}>
        {opponentSeats.map((seat: any) => (
          <View key={seat.seatIndex} style={styles.opponentBlock}>
            <Text style={styles.opponentName} numberOfLines={1}>
              {seat.displayName}{seat.isAI ? ' 🤖' : ''} · {seat.matchScore ?? 0}pts
            </Text>
            <View style={styles.miniHand}>
              {(seat.hand ?? []).map((_: any, i: number) => (
                <PlayingCard key={i} faceDown size="sm" style={{ marginLeft: i === 0 ? 0 : -20 }} />
              ))}
            </View>
            {state.currentSeat === seat.seatIndex && <View style={styles.turnDot} />}
          </View>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Table</Text>
      <View style={styles.tableArea}>
        {state.builds.map((b) => (
          <TouchableOpacity
            key={b.id}
            style={[styles.buildStack, selectedTargets.includes(b.id) && styles.targetSelected]}
            onPress={() => isMyTurn && toggleTarget(b.id)}
          >
            <Text style={styles.buildValue}>{b.value}</Text>
            <View style={styles.buildCards}>
              {b.cards.map((c, i) => (
                <PlayingCard key={i} suit={c.suit} rank={c.rank} size="sm" style={{ marginLeft: i === 0 ? 0 : -30 }} />
              ))}
            </View>
            <Text style={styles.buildOwner}>{state.seats[b.ownerSeat]?.displayName}'s build</Text>
          </TouchableOpacity>
        ))}
        {state.table.map((c) => (
          <PlayingCard
            key={cardKey(c)}
            suit={c.suit}
            rank={c.rank}
            size="md"
            selected={selectedTargets.includes(cardKey(c))}
            onPress={isMyTurn ? () => toggleTarget(cardKey(c)) : undefined}
          />
        ))}
        {state.table.length === 0 && state.builds.length === 0 && (
          <Text style={styles.emptyTableText}>Table is empty</Text>
        )}
      </View>

      {isMyTurn && armedCard && (
        <View style={styles.actionBar}>
          <Text style={styles.actionHint}>
            Playing {armedCard.rank === 1 ? 'A' : armedCard.rank}{armedCard.suit} — select table cards/builds, then choose an action
          </Text>
          <View style={styles.actionButtons}>
            {captureMove && (
              <TouchableOpacity style={[styles.actionBtn, styles.captureBtn]} onPress={() => runMove(captureMove)}>
                <Text style={styles.actionBtnText}>Capture</Text>
              </TouchableOpacity>
            )}
            {buildMove && (
              <TouchableOpacity style={[styles.actionBtn, styles.buildBtn]} onPress={() => runMove(buildMove)}>
                <Text style={styles.actionBtnText}>Build {buildMove.buildValue}</Text>
              </TouchableOpacity>
            )}
            {extendMove && (
              <TouchableOpacity style={[styles.actionBtn, styles.buildBtn]} onPress={() => runMove(extendMove)}>
                <Text style={styles.actionBtnText}>
                  {extendMove.kind === 'takeOverBuild' ? 'Take Over' : 'Extend'} → {extendMove.buildValue}
                </Text>
              </TouchableOpacity>
            )}
            {trailAvailable && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.trailBtn]}
                onPress={() => runMove({ kind: 'trail', card: armedCard, targetIds: [] })}
              >
                <Text style={styles.actionBtnText}>Trail</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => { setArmedCard(null); setSelectedTargets([]); }}>
              <Ionicons name="close" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.handRow}>
        {myHand.map((card, i) => (
          <PlayingCard
            key={i}
            suit={card.suit}
            rank={card.rank}
            size="lg"
            selected={armedCard ? cardKey(armedCard) === cardKey(card) : false}
            onPress={
              isMyTurn && !finished
                ? () => {
                    setArmedCard((prev) => (prev && cardKey(prev) === cardKey(card) ? null : card));
                    setSelectedTargets([]);
                  }
                : undefined
            }
            style={{ marginLeft: i === 0 ? 0 : -18 }}
          />
        ))}
      </ScrollView>

      <Text style={styles.instructions}>
        {finished ? '' : !isMyTurn ? 'Waiting for opponent…' : armedCard ? 'Tap Capture / Build / Trail' : 'Tap a card from your hand to play it'}
      </Text>

      <Modal visible={finished} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Ionicons name={iWon ? 'trophy' : 'sad'} size={48} color={iWon ? COLORS.gold : COLORS.textMuted} />
            <Text style={styles.modalTitle}>{iWon ? 'You won!' : 'Game over'}</Text>
            <View style={styles.scoreSummary}>
              {state.seats.map((s: any) => (
                <Text key={s.seatIndex} style={styles.modalSubtitle}>{s.displayName}: {s.matchScore} pts</Text>
              ))}
            </View>
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
  scoreText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 12 },
  opponentsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: SPACING.xs },
  opponentBlock: { alignItems: 'center', gap: 4 },
  opponentName: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', maxWidth: 140 },
  miniHand: { flexDirection: 'row' },
  turnDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.gold },
  sectionLabel: { ...TYPOGRAPHY.label, marginLeft: SPACING.lg, marginTop: SPACING.xs },
  tableArea: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, alignItems: 'center', justifyContent: 'center',
    minHeight: 120, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
  },
  emptyTableText: { color: COLORS.textMuted, fontSize: 13 },
  buildStack: { alignItems: 'center', gap: 2, padding: 4, borderRadius: RADIUS.sm },
  buildCards: { flexDirection: 'row' },
  buildValue: { color: COLORS.gold, fontWeight: '900', fontSize: 16 },
  buildOwner: { color: COLORS.textMuted, fontSize: 9 },
  targetSelected: { backgroundColor: 'rgba(139,92,246,0.2)', borderWidth: 1, borderColor: COLORS.primary },
  actionBar: {
    marginHorizontal: SPACING.lg, backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.md, padding: SPACING.sm, gap: 8,
  },
  actionHint: { color: COLORS.textMuted, fontSize: 11, textAlign: 'center' },
  actionButtons: { flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: RADIUS.pill },
  captureBtn: { backgroundColor: COLORS.success },
  buildBtn: { backgroundColor: COLORS.primary },
  trailBtn: { backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.glassBorder },
  cancelBtn: { backgroundColor: COLORS.surfaceElevated, paddingHorizontal: 10, justifyContent: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  handRow: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, alignItems: 'flex-end', flexGrow: 1, justifyContent: 'center' },
  instructions: { textAlign: 'center', color: COLORS.textMuted, fontSize: 13, marginBottom: SPACING.lg },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  modalCard: {
    backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.lg, padding: SPACING.xl,
    alignItems: 'center', gap: 8, width: '80%', borderWidth: 1, borderColor: COLORS.glassBorder,
  },
  modalTitle: { ...TYPOGRAPHY.h2 },
  modalSubtitle: { color: COLORS.textMuted, textAlign: 'center', fontSize: 13 },
  scoreSummary: { gap: 2, marginVertical: 4 },
  modalBtn: { marginTop: SPACING.md, backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, paddingVertical: 12, paddingHorizontal: 24 },
  modalBtnText: { color: '#fff', fontWeight: '700' },
});
