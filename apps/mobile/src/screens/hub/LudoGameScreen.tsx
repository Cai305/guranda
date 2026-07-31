import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import io, { Socket } from 'socket.io-client';
import {
  LudoGameDto, LUDO_MODES, LudoMode, SEAT_COLORS, getLegalMoves, getTeamOf,
} from '@mxit2/types';
import { TYPOGRAPHY, RADIUS, GRADIENTS } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL, fetchApi } from '../../utils/api';
import LudoBoard from '../../components/LudoBoard';
import { beep } from '../../utils/beep';
import GiftButton from '../../components/gifts/GiftButton';
import SessionHeaderActions from '../../components/SessionHeaderActions';

const BG = '#1E0A38';
const GOLD = '#F2C21F';


// For the classic 4-corner board, which seat occupies which screen corner:
//   seat 3 → top-left   (Blue,  YARD_ORIGINS col 0-5 row 0-5)
//   seat 0 → top-right  (Red,   YARD_ORIGINS col 9-14 row 0-5)
//   seat 2 → bot-left   (Yellow,YARD_ORIGINS col 0-5 row 9-14)
//   seat 1 → bot-right  (Green, YARD_ORIGINS col 9-14 row 9-14)
const TOP_LEFT_SEAT  = 3;
const TOP_RIGHT_SEAT = 0;
const BOT_LEFT_SEAT  = 2;
const BOT_RIGHT_SEAT = 1;

// ── Player corner avatar ─────────────────────────────────────────────────────
function PlayerCorner({
  seatIndex, game, emptySeats, mySeat,
}: {
  seatIndex: number;
  game: LudoGameDto;
  emptySeats: number[];
  mySeat: number | null;
}) {
  const isEmpty   = emptySeats.includes(seatIndex);
  const seatData  = game.seats.find(s => s.seatIndex === seatIndex);
  const isTurn    = game.currentSeat === seatIndex && game.status === 'active';
  const isMe      = mySeat === seatIndex;
  const color     = SEAT_COLORS[seatIndex];

  if (isEmpty || !seatData) {
    return <View style={cs.cornerEmpty} />;
  }

  return (
    <View style={cs.corner}>
      {/* Avatar circle */}
      <View style={[cs.avatar, { borderColor: color }, isTurn && { borderWidth: 3, shadowColor: color }]}>
        <Ionicons
          name={seatData.isAI ? 'hardware-chip-outline' : 'person'}
          size={20}
          color={color}
        />
        {isTurn && <View style={[cs.turnPip, { backgroundColor: color }]} />}
      </View>
      {/* Name */}
      <Text style={cs.name} numberOfLines={1}>
        {isMe ? 'You' : (seatData.displayName || '—')}
      </Text>
    </View>
  );
}

// ── Dice / status zone (centre of bottom row) ────────────────────────────────
function DiceZone({
  game, mySeat, selectableTokenIndices, rolling, diceScale, onRoll,
}: {
  game: LudoGameDto;
  mySeat: number | null;
  selectableTokenIndices: number[];
  rolling: boolean;
  diceScale: Animated.Value;
  onRoll: () => void;
}) {
  const isMyTurn = mySeat !== null && game.currentSeat === mySeat && game.status === 'active';
  const color    = SEAT_COLORS[game.currentSeat];
  const current  = game.seats.find(s => s.seatIndex === game.currentSeat);

  if (game.status !== 'active') return null;

  if (isMyTurn && game.diceValue === null) {
    return (
      <View style={dz.root}>
        <TouchableOpacity onPress={onRoll} disabled={rolling} activeOpacity={0.85}>
          <Animated.View style={{ transform: [{ scale: diceScale }] }}>
            <View style={[dz.btn, { backgroundColor: color }]}>
              {rolling
                ? <ActivityIndicator color="#FFF" size="large" />
                : <Ionicons name="dice" size={36} color="#FFF" />}
            </View>
          </Animated.View>
        </TouchableOpacity>
        <Text style={dz.hint}>TAP TO ROLL</Text>
      </View>
    );
  }

  if (isMyTurn && game.diceValue !== null) {
    return (
      <View style={dz.root}>
        <View style={[dz.face, { borderColor: color }]}>
          <Text style={dz.faceNum}>{game.diceValue}</Text>
        </View>
        <Text style={dz.hint}>
          {selectableTokenIndices.length > 0 ? 'Tap a token' : 'No moves'}
        </Text>
      </View>
    );
  }

  // Opponent's / AI turn
  return (
    <View style={dz.root}>
      <View style={[dz.btn, { backgroundColor: color, opacity: 0.45 }]}>
        <ActivityIndicator color="#FFF" />
      </View>
      <Text style={dz.hint} numberOfLines={1}>
        {current?.isAI ? 'Bot thinking…' : `${current?.displayName ?? '?'}'s turn`}
      </Text>
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function LudoGameScreen({ route, navigation }: any) {
  const { gameId, mySeat: mySeatParam } = route.params;
  const ludoSession = {
    id: 'ludo',
    label: 'Ludo',
    icon: 'dice',
    gradient: GRADIENTS.sunset,
    route: {
      name: 'Main',
      params: { screen: 'Life', params: { screen: 'LudoGame', params: { gameId, mySeat: mySeatParam } } },
    },
  };
  const { user } = useAuth();
  const [game,          setGame]          = useState<LudoGameDto | null>(null);
  const [socket,        setSocket]        = useState<Socket | null>(null);
  const [rolling,       setRolling]       = useState(false);
  const [displayTokens, setDisplayTokens] = useState<number[][] | null>(null);
  const [boardAreaH,    setBoardAreaH]    = useState(0);
  const diceScale      = useRef(new Animated.Value(1)).current;
  const prevTokensRef  = useRef<number[][] | null>(null);
  const hopTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Socket + REST setup ────────────────────────────────────────────────────
  useEffect(() => {
    fetchApi(`/ludo/${gameId}`)
      .then(r => r.json())
      .then((data: LudoGameDto) => { setGame(data); prevTokensRef.current = data.tokens; })
      .catch(console.error);

    const sock = io(`${API_BASE_URL}/ludo`);
    setSocket(sock);
    sock.on('connect', () => sock.emit('join_game', { gameId }));

    sock.on('game_updated', (updated: LudoGameDto) => {
      setRolling(false);
      const prev = prevTokensRef.current;
      prevTokensRef.current = updated.tokens;

      if (!prev) { setGame(updated); return; }

      // Find the forward-moving token (captures jump to -1 — skip).
      let movedSeat = -1, movedIdx = -1, fromSteps = 0, toSteps = 0;
      outer: for (let s = 0; s < prev.length; s++) {
        for (let t = 0; t < (prev[s]?.length ?? 0); t++) {
          const oldV = prev[s][t], newV = updated.tokens[s]?.[t] ?? oldV;
          if (oldV !== newV && newV !== -1) {
            movedSeat = s; movedIdx = t; fromSteps = oldV; toSteps = newV;
            break outer;
          }
        }
      }

      setGame(updated);

      if (movedSeat < 0) { setDisplayTokens(null); return; }

      const startStep = fromSteps === -1 ? 0 : fromSteps + 1;
      const hops: number[] = [];
      for (let step = startStep; step <= toSteps; step++) hops.push(step);

      if (hops.length <= 1) { setDisplayTokens(null); return; }

      // Freeze the moved token at its old position; captures already applied.
      setDisplayTokens(updated.tokens.map((toks, s) =>
        s !== movedSeat ? [...toks] : toks.map((v, t) => (t === movedIdx ? fromSteps : v)),
      ));

      if (hopTimerRef.current) clearInterval(hopTimerRef.current);
      let hi = 0;
      hopTimerRef.current = setInterval(() => {
        const step = hops[hi++];
        setDisplayTokens(cur => {
          if (!cur) return null;
          const next = cur.map(s => [...s]);
          next[movedSeat][movedIdx] = step;
          return next;
        });
        if (hi >= hops.length) {
          clearInterval(hopTimerRef.current!);
          hopTimerRef.current = null;
          setDisplayTokens(null);
        }
      }, 170);
    });

    sock.on('invalid_action', () => setRolling(false));

    return () => { sock.disconnect(); if (hopTimerRef.current) clearInterval(hopTimerRef.current); };
  }, [gameId]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const mySeat = useMemo(() => {
    if (typeof mySeatParam === 'number') return mySeatParam;
    if (!game || !user) return null;
    const s = game.seats.find(s => s.userId === user.userId);
    return s ? s.seatIndex : null;
  }, [game, user, mySeatParam]);

  const mode = game ? LUDO_MODES[game.mode as LudoMode] : null;

  const selectableTokenIndices = useMemo(() => {
    if (!game || !mode || mySeat === null || game.currentSeat !== mySeat || game.diceValue === null) return [];
    return getLegalMoves(game.tokens, mySeat, mode.corners, game.diceValue, mode.teams).map(m => m.tokenIndex);
  }, [game, mode, mySeat]);

  const prevSelectRef = useRef(0);
  useEffect(() => {
    if (selectableTokenIndices.length > 0 && prevSelectRef.current === 0) beep();
    prevSelectRef.current = selectableTokenIndices.length;
  }, [selectableTokenIndices.length]);

  const emptySeats = useMemo(
    () => (game ? game.seats.filter(s => !s.isAI && !s.userId).map(s => s.seatIndex) : []),
    [game],
  );

  // The first human opponent seat — gifting targets a real player, never an AI.
  const giftRecipient = useMemo(() => {
    if (!game) return null;
    const opp = game.seats.find(s => !s.isAI && s.userId && s.seatIndex !== mySeat);
    return opp ? { id: opp.userId as string, name: opp.displayName || 'Player' } : null;
  }, [game, mySeat]);

  // boardSize is set by onLayout of the board container row (below).

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!game || !mode) {
    return (
      <SafeAreaView style={[s.root, s.centered]}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={[TYPOGRAPHY.body2, { marginTop: 14, color: 'rgba(255,255,255,0.6)' }]}>
          Loading game…
        </Text>
      </SafeAreaView>
    );
  }

  const myTeam = mySeat !== null ? getTeamOf(mySeat, mode.teams) : -1;
  const iWon   = game.status === 'finished' && game.winnerTeam === myTeam;

  const bounceDice = () => {
    diceScale.setValue(0.7);
    Animated.spring(diceScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  };

  const handleRoll = () => {
    if (!socket || !user || rolling) return;
    setRolling(true);
    bounceDice();
    socket.emit('roll_dice', { gameId, userId: user.userId });
  };

  const handleSelectToken = (tokenIndex: number) => {
    if (!socket || !user) return;
    socket.emit('move_token', { gameId, userId: user.userId, tokenIndex });
  };

  const isClassic = mode.corners === 4;

  // ── Classic 4-corner layout ────────────────────────────────────────────────
  if (isClassic) {
    return (
      <SafeAreaView style={s.root} edges={['top', 'bottom']}>

        {/* TOP PLAYER ROW */}
        <View style={s.topRow}>
          <PlayerCorner seatIndex={TOP_LEFT_SEAT}  game={game} emptySeats={emptySeats} mySeat={mySeat} />
          {/* Minimize/Exit in the very center top */}
          <SessionHeaderActions navigation={navigation} session={ludoSession} />
          <PlayerCorner seatIndex={TOP_RIGHT_SEAT} game={game} emptySeats={emptySeats} mySeat={mySeat} />
        </View>

        {/* BOARD — sized to the measured container so it never overflows */}
        <View
          style={s.boardArea}
          onLayout={e => setBoardAreaH(e.nativeEvent.layout.height)}
        >
          {boardAreaH > 0 && (
            <View style={{ width: boardAreaH, height: boardAreaH, alignSelf: 'center' }}>
              <LudoBoard
                corners={mode.corners}
                tokens={displayTokens ?? game.tokens}
                currentSeat={game.currentSeat}
                mySeat={mySeat}
                selectableTokenIndices={selectableTokenIndices}
                hiddenSeats={emptySeats}
                onSelectToken={handleSelectToken}
              />
            </View>
          )}
        </View>

        {/* BOTTOM CONTROLS ROW */}
        <View style={s.botRow}>
          <PlayerCorner seatIndex={BOT_LEFT_SEAT}  game={game} emptySeats={emptySeats} mySeat={mySeat} />
          <DiceZone
            game={game}
            mySeat={mySeat}
            selectableTokenIndices={selectableTokenIndices}
            rolling={rolling}
            diceScale={diceScale}
            onRoll={handleRoll}
          />
          <PlayerCorner seatIndex={BOT_RIGHT_SEAT} game={game} emptySeats={emptySeats} mySeat={mySeat} />
        </View>

        {/* ACTION BAR */}
        <View style={s.actionBar}>
          <TouchableOpacity style={s.actionBtn} onPress={() => Alert.alert('Emoji reactions coming soon!')}>
            <Text style={s.actionBtnText}>EMOJI</Text>
          </TouchableOpacity>
          <View style={s.actionDivider} />
          <TouchableOpacity style={s.actionBtn} onPress={() => Alert.alert('Chat coming soon!')}>
            <Text style={s.actionBtnText}>CHAT</Text>
          </TouchableOpacity>
          {giftRecipient && (
            <>
              <View style={s.actionDivider} />
              <GiftButton
                recipientId={giftRecipient.id}
                recipientName={giftRecipient.name}
                context="game"
                contextId={gameId}
                size={28}
              />
            </>
          )}
        </View>

        {/* GAME OVER OVERLAY */}
        {game.status === 'finished' && (
          <GameOverModal
            iWon={iWon}
            game={game}
            mode={mode}
            mySeat={mySeat}
            onLeave={() => navigation.goBack()}
          />
        )}
      </SafeAreaView>
    );
  }

  // ── Fallback layout for 6/8-corner star board ─────────────────────────────
  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.fallbackHeader}>
        <SessionHeaderActions navigation={navigation} session={ludoSession} />
        <Text style={s.fallbackTitle}>{mode.label}</Text>
        {giftRecipient ? (
          <GiftButton
            recipientId={giftRecipient.id}
            recipientName={giftRecipient.name}
            context="game"
            contextId={gameId}
            size={26}
          />
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <View style={s.boardArea}>
        <LudoBoard
          corners={mode.corners}
          tokens={displayTokens ?? game.tokens}
          currentSeat={game.currentSeat}
          mySeat={mySeat}
          selectableTokenIndices={selectableTokenIndices}
          hiddenSeats={emptySeats}
          onSelectToken={handleSelectToken}
        />
      </View>

      <View style={s.fallbackControls}>
        <DiceZone
          game={game}
          mySeat={mySeat}
          selectableTokenIndices={selectableTokenIndices}
          rolling={rolling}
          diceScale={diceScale}
          onRoll={handleRoll}
        />
      </View>

      {game.status === 'finished' && (
        <GameOverModal
          iWon={iWon}
          game={game}
          mode={mode}
          mySeat={mySeat}
          onLeave={() => navigation.goBack()}
        />
      )}
    </SafeAreaView>
  );
}

// ── Game over modal ──────────────────────────────────────────────────────────
function GameOverModal({ iWon, game, mode, mySeat, onLeave }: {
  iWon: boolean;
  game: LudoGameDto;
  mode: any;
  mySeat: number | null;
  onLeave: () => void;
}) {
  return (
    <View style={ov.backdrop}>
      <LinearGradient
        colors={iWon ? ['#2D1155', '#4A0E8F'] : ['#1E0A38', '#2D0A5A']}
        style={ov.card}
      >
        {iWon ? (
          <>
            <Text style={ov.emoji}>🏆</Text>
            <Text style={ov.title}>You Won!</Text>
          </>
        ) : (
          <>
            <Text style={ov.emoji}>😔</Text>
            <Text style={ov.title}>Better Luck Next Time</Text>
          </>
        )}

        <View style={ov.winnerRow}>
          {(mode.teams[game.winnerTeam ?? 0] ?? []).map((seat: number) => (
            <View key={seat} style={[ov.winnerDot, { backgroundColor: SEAT_COLORS[seat] }]} />
          ))}
          <Text style={ov.winnerLabel}>
            {(mode.teams[game.winnerTeam ?? 0] ?? [])
              .map((seat: number) => seat === mySeat ? 'You' : game.seats.find(s => s.seatIndex === seat)?.displayName)
              .join(' & ')}
          </Text>
        </View>

        <TouchableOpacity onPress={onLeave} activeOpacity={0.85}>
          <LinearGradient colors={[GOLD, '#C49A0C']} style={ov.leaveBtn}>
            <Text style={ov.leaveBtnText}>Back to Lobby</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  centered:{ justifyContent: 'center', alignItems: 'center' },

  // 4-corner layout
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 4,
    height: 82,
  },
  backBtn: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center',
  },
  boardArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  botRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 4,
    minHeight: 100,
  },
  actionBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
    height: 48,
  },
  actionBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 1,
  },
  actionDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginVertical: 10,
  },

  // Fallback layout
  fallbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  fallbackTitle: { color: '#FFF', fontWeight: '700', fontSize: 18 },
  fallbackControls: { paddingVertical: 16, alignItems: 'center' },
});

// Player corner
const cs = StyleSheet.create({
  corner: { width: 72, alignItems: 'center', gap: 4 },
  cornerEmpty: { width: 72 },
  avatar: {
    width: 48, height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOpacity: 0.7,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  turnPip: {
    position: 'absolute',
    bottom: -2, right: -2,
    width: 12, height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: BG,
  },
  name: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});

// Dice zone
const dz = StyleSheet.create({
  root: { alignItems: 'center', gap: 6, flex: 1 },
  btn: {
    width: 68, height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  face: {
    width: 60, height: 60,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceNum: {
    color: '#FFF',
    fontSize: 30,
    fontWeight: '900',
  },
  hint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
});

// Overlay
const ov = StyleSheet.create({
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center', alignItems: 'center',
  },
  card: {
    width: 300,
    borderRadius: RADIUS.xl,
    padding: 32,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(242,194,31,0.3)',
  },
  emoji: { fontSize: 52 },
  title: { color: '#FFF', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  winnerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  winnerDot: { width: 12, height: 12, borderRadius: 6 },
  winnerLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  leaveBtn: {
    borderRadius: RADIUS.pill,
    paddingVertical: 12, paddingHorizontal: 32,
    marginTop: 4,
  },
  leaveBtnText: { color: '#1E0A38', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },
});
