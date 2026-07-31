import React, { useEffect, useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import io, { Socket } from 'socket.io-client';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, GRADIENTS } from '../../theme';
import MurabarabaBoard, { P1_COLOR, P2_COLOR } from '../../games/murabaraba/MurabarabaBoard';
import {
  GameState, Player,
  newGame, applyAction, movesFrom, shootablePoints, phaseOf, cowsOnBoard, TOTAL_COWS,
} from '../../games/murabaraba/engine';
import { bestAction, Difficulty } from '../../games/murabaraba/ai';
import { MurabarabaSeatDto } from '@mxit2/types';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL, fetchApi } from '../../utils/api';
import SessionHeaderActions from '../../components/SessionHeaderActions';

type Mode = 'ai' | 'local' | 'online';

const AI_PLAYER: Player = 1;
const AI_DELAY_MS = 550;

export default function MurabarabaGameScreen({ navigation, route }: any) {
  const mode: Mode = route.params?.mode ?? 'ai';
  const difficulty: Difficulty = route.params?.difficulty ?? 'medium';
  const gameId: string | undefined = route.params?.gameId;
  const { user } = useAuth();
  const isOnline = mode === 'online';

  const [state, setState] = useState<GameState>(newGame);
  const [selected, setSelected] = useState<number | null>(null);
  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 24, 380);

  // ── Online: seats, active seat, socket, loading gate ──
  const [seats, setSeats] = useState<MurabarabaSeatDto[]>([]);
  const [activeSeat, setActiveSeat] = useState(0);
  const [onlineLoading, setOnlineLoading] = useState(isOnline);
  const socketRef = useRef<Socket | null>(null);
  const mySeat = isOnline ? seats.find(s => s.userId === user?.userId) : null;
  const isMyOnlineTurn = isOnline && mySeat !== null && mySeat !== undefined && mySeat.seatIndex === activeSeat;

  useEffect(() => {
    if (!isOnline || !gameId) return;
    fetchApi(`/murabaraba/${gameId}`)
      .then(res => (res.ok ? res.json() : null))
      .then(game => {
        if (!game) return;
        setState(game.state);
        setSeats(game.seats);
        setActiveSeat(game.activeSeat);
      })
      .finally(() => setOnlineLoading(false));

    const sock = io(`${API_BASE_URL}/murabaraba`);
    socketRef.current = sock;
    sock.on('connect', () => sock.emit('join_game', { gameId }));
    sock.on('game_updated', (game: any) => {
      setState(game.state);
      setSeats(game.seats);
      setActiveSeat(game.activeSeat);
    });

    return () => { sock.disconnect(); socketRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, gameId]);

  const isAiTurn =
    mode === 'ai' && state.turn === AI_PLAYER && state.winner === null && !state.draw;

  // Drive the AI: one action per tick; pendingShot chains re-trigger the effect.
  useEffect(() => {
    if (!isAiTurn) return;
    aiTimer.current = setTimeout(() => {
      setState(s => {
        const a = bestAction(s, difficulty);
        return a ? applyAction(s, a) : s;
      });
    }, AI_DELAY_MS);
    return () => {
      if (aiTimer.current) clearTimeout(aiTimer.current);
    };
  }, [isAiTurn, state, difficulty]);

  const canAct =
    state.winner === null && !state.draw &&
    (mode === 'local' ? true : mode === 'ai' ? !isAiTurn : isMyOnlineTurn);

  const legalTargets = useMemo(
    () => (selected !== null && !state.pendingShot ? movesFrom(state, selected) : []),
    [selected, state],
  );
  const shootTargets = useMemo(
    () => (state.pendingShot && canAct ? shootablePoints(state) : []),
    [state, canAct],
  );

  const emitPlace = (to: number) =>
    socketRef.current?.emit('place_cow', { gameId, userId: user?.userId, to });
  const emitMove = (from: number, to: number) =>
    socketRef.current?.emit('move_cow', { gameId, userId: user?.userId, from, to });
  const emitShoot = (at: number) =>
    socketRef.current?.emit('shoot_cow', { gameId, userId: user?.userId, at });

  const onPointPress = (point: number) => {
    if (!canAct) return;

    if (state.pendingShot) {
      if (shootablePoints(state).includes(point)) {
        if (isOnline) emitShoot(point);
        else setState(applyAction(state, { type: 'shoot', at: point }));
        setSelected(null);
      }
      return;
    }

    const phase = phaseOf(state, state.turn);
    if (phase === 'placement') {
      if (state.board[point] === null) {
        if (isOnline) emitPlace(point);
        else setState(applyAction(state, { type: 'place', to: point }));
      }
      return;
    }

    // movement / flying
    if (state.board[point] === state.turn) {
      setSelected(selected === point ? null : point);
      return;
    }
    if (selected !== null && legalTargets.includes(point)) {
      if (isOnline) emitMove(selected, point);
      else setState(applyAction(state, { type: 'move', from: selected, to: point }));
      setSelected(null);
    }
  };

  const restart = () => {
    if (isOnline) return;
    setState(newGame());
    setSelected(null);
  };

  const nameOf = (p: Player) => {
    if (mode === 'ai') return p === 0 ? 'You' : `AI (${difficulty})`;
    if (mode === 'online') {
      const sideSeats = seats.filter(s => s.side === p);
      if (sideSeats.length === 0) return p === 0 ? 'Side A' : 'Side B';
      return sideSeats.map(s => (s.userId === user?.userId ? 'You' : (s.displayName || 'Player'))).join(' & ');
    }
    return p === 0 ? 'Player 1' : 'Player 2';
  };

  const statusText = () => {
    if (state.winner !== null) return `${nameOf(state.winner)} won the kraal! 🏆`;
    if (state.draw) return 'Draw — no cow shot in 10 moves';
    if (state.pendingShot) return `${nameOf(state.turn)}: MILL! Shoot an enemy cow`;
    const phase = phaseOf(state, state.turn);
    if (phase === 'placement') return `${nameOf(state.turn)}: place a cow (${state.cowsToPlace[state.turn]} left)`;
    if (phase === 'flying') return `${nameOf(state.turn)}: 3 cows left — fly anywhere!`;
    return `${nameOf(state.turn)}: move a cow`;
  };

  const renderPlayerPanel = (p: Player) => {
    const active = state.turn === p && state.winner === null && !state.draw;
    return (
      <View style={[styles.playerPanel, active && styles.playerPanelActive]}>
        <View style={[styles.cowDot, { backgroundColor: p === 0 ? P1_COLOR : P2_COLOR }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.playerName}>{nameOf(p)}</Text>
          <Text style={styles.playerMeta}>
            {state.cowsToPlace[p] > 0
              ? `${state.cowsToPlace[p]} to place`
              : `${cowsOnBoard(state, p)} on board`}
            {'  ·  '}
            {TOTAL_COWS - state.captured[p] - (state.cowsToPlace[p] + cowsOnBoard(state, p)) === 0
              ? `${state.captured[p]} lost`
              : `${state.captured[p]} lost`}
          </Text>
        </View>
        {active && <Ionicons name="caret-back" size={18} color={COLORS.success} />}
      </View>
    );
  };

  const gameOver = state.winner !== null || state.draw;

  if (isOnline && onlineLoading) {
    return (
      <SafeAreaView style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0EA5E9" />
        <Text style={[TYPOGRAPHY.body2, { marginTop: 14 }]}>Loading kraal…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <SessionHeaderActions
          navigation={navigation}
          session={{
            id: 'murabaraba',
            label: 'Murabaraba',
            icon: 'apps',
            gradient: GRADIENTS.sunset,
            route: isOnline && gameId
              ? { name: 'Main', params: { screen: 'Life', params: { screen: 'MurabarabaGame', params: { mode: 'online', gameId } } } }
              : { name: 'Main', params: { screen: 'Life', params: { screen: 'MurabarabaLobby' } } },
          }}
        />
        <Text style={TYPOGRAPHY.h2}>Murabaraba</Text>
        {isOnline ? (
          <View style={{ width: 40 }} />
        ) : (
          <TouchableOpacity style={styles.backBtn} onPress={restart}>
            <Ionicons name="refresh" size={20} color={COLORS.text} />
          </TouchableOpacity>
        )}
      </View>

      {renderPlayerPanel(1)}

      <View style={styles.boardWrap}>
        <MurabarabaBoard
          board={state.board}
          selected={selected}
          legalTargets={legalTargets}
          shootTargets={shootTargets}
          lastMoveTo={state.lastMove?.to ?? null}
          onPointPress={onPointPress}
          size={boardSize}
        />
      </View>

      {renderPlayerPanel(0)}

      <View style={[styles.statusBar, state.pendingShot && styles.statusBarShoot]}>
        <Text style={styles.statusText}>{statusText()}</Text>
      </View>

      {gameOver && (
        <View style={styles.overlay}>
          <LinearGradient colors={['#3A0E6E', '#200840']} style={styles.overlayCard}>
            <Text style={styles.overlayEmoji}>{state.draw ? '🤝' : '🏆'}</Text>
            <Text style={styles.overlayTitle}>
              {state.draw ? 'Draw!' : `${nameOf(state.winner as Player)} wins!`}
            </Text>
            <Text style={styles.overlaySub}>
              {state.draw
                ? 'Neither herd could finish the job.'
                : 'The enemy kraal is down to 2 cows.'}
            </Text>
            {!isOnline && (
              <TouchableOpacity style={styles.overlayBtn} onPress={restart}>
                <Text style={styles.overlayBtnText}>Play Again</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.overlayBtnGhost} onPress={() => navigation.goBack()}>
              <Text style={styles.overlayBtnGhostText}>Back to Lobby</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.glass,
    borderWidth: 1, borderColor: COLORS.glassBorder,
    justifyContent: 'center', alignItems: 'center',
  },
  playerPanel: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: SPACING.lg, marginVertical: 6,
    padding: 12,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.glassBorder,
  },
  playerPanelActive: { borderColor: COLORS.success },
  cowDot: { width: 22, height: 22, borderRadius: 11 },
  playerName: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
  playerMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  boardWrap: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  statusBar: {
    margin: SPACING.lg,
    padding: 14,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.glassBorder,
    alignItems: 'center',
  },
  statusBarShoot: { borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.12)' },
  statusText: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center',
  },
  overlayCard: {
    width: '80%',
    borderRadius: RADIUS.lg,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.glassBorder,
  },
  overlayEmoji: { fontSize: 44 },
  overlayTitle: { color: COLORS.text, fontSize: 22, fontWeight: '800', marginTop: 8 },
  overlaySub: { color: COLORS.textMuted, fontSize: 13, marginTop: 6, textAlign: 'center' },
  overlayBtn: {
    marginTop: 18,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingVertical: 12, paddingHorizontal: 36,
  },
  overlayBtnText: { color: '#FFF', fontWeight: '700' },
  overlayBtnGhost: { marginTop: 10, paddingVertical: 8 },
  overlayBtnGhostText: { color: COLORS.textMuted, fontWeight: '600' },
});
