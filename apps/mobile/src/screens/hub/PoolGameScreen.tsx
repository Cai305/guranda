import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, useWindowDimensions,
  PanResponder, Alert, ActivityIndicator, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import io, { Socket } from 'socket.io-client';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, GRADIENTS } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import SessionHeaderActions from '../../components/SessionHeaderActions';
import PoolTable from '../../games/pool/PoolTable';
import {
  Ball, ShotEvents, TABLE_W,
  rackBalls, strikeCue, advance, ballsMoving, respotCue,
} from '../../games/pool/physics';
import {
  PoolState, PoolPlayer, newPoolState, applyShot, ballsLeft, onEight,
} from '../../games/pool/rules';
import { chooseShot, PoolDifficulty } from '../../games/pool/ai';
import { API_BASE_URL, fetchApi } from '../../utils/api';
import GiftButton from '../../components/gifts/GiftButton';

type Mode = 'ai' | 'local' | 'online';
const AI_PLAYER: PoolPlayer = 1;

export default function PoolGameScreen({ navigation, route }: any) {
  const mode: Mode = route.params?.mode ?? 'ai';
  const difficulty: PoolDifficulty = route.params?.difficulty ?? 'medium';
  const wager: number = route.params?.wager ?? 0;
  const gameId: string | undefined = route.params?.gameId;
  const { user } = useAuth();

  const isOnline = mode === 'online';
  const { width, height: screenHeight } = useWindowDimensions();
  const isSmallScreen = width < 700;
  // Controls live beside the table now (vertical power bar + icon shoot
  // button), not in a row below it, so the table itself can claim almost
  // all the remaining space after the header/panels/status chrome.
  const SIDE_CONTROLS_W = 78;
  // Pool screens render nested under the bottom tab bar (not full-screen),
  // so useWindowDimensions().height includes ~60px the table can't actually
  // use — this reserve covers header + panels + status bar + that tab bar.
  const CHROME_RESERVE = 250;
  const tableWidth = isSmallScreen
    ? Math.min(screenHeight - CHROME_RESERVE, (width - SIDE_CONTROLS_W - 24) * 2, 760)
    : Math.min(width - SIDE_CONTROLS_W - 32, screenHeight - CHROME_RESERVE, 640);

  const ballsRef = useRef<Ball[]>(rackBalls());
  const [balls, setBalls] = useState<Ball[]>([...ballsRef.current]);
  const [state, setState] = useState<PoolState>(newPoolState());
  const [aimAngle, setAimAngle] = useState(0);
  const [power, setPower] = useState(0.6);
  const [shooting, setShooting] = useState(false);
  const [wagerNote, setWagerNote] = useState('');
  const rafRef = useRef<number | null>(null);
  const settled = useRef(false);

  // ── Online: seats, socket, loading gate ──
  const [seats, setSeats] = useState<{ seatIndex: number; userId: string | null; displayName: string }[]>([]);
  const [onlineLoading, setOnlineLoading] = useState(isOnline);
  const socketRef = useRef<Socket | null>(null);
  const emitResultOnSettle = useRef(false);
  const mySeat = isOnline ? seats.findIndex(s => s.userId === user?.userId) : 0;
  const opponentSeat = isOnline ? seats.find(s => s.userId !== user?.userId) : null;

  const isAiTurn = mode === 'ai' && state.turn === AI_PLAYER && !state.winner;
  const isMyOnlineTurn = !isOnline || (mySeat !== -1 && state.turn === mySeat);
  const canAct = !shooting && !state.winner && (mode === 'local' ? true : mode === 'ai' ? !isAiTurn : isMyOnlineTurn);

  // Pink pulse on your own avatar + the message pill whenever it's your
  // turn to shoot — a loud, unmistakable "go" signal.
  const pulse = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    if (!canAct) {
      pulse.setValue(0.35);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 550, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [canAct]);

  // ── Online: fetch initial game + connect socket ──
  useEffect(() => {
    if (!isOnline || !gameId) return;
    fetchApi(`/pool/${gameId}`)
      .then(res => (res.ok ? res.json() : null))
      .then(game => {
        if (!game) return;
        ballsRef.current = game.balls;
        setBalls(game.balls);
        setState(game.state);
        setSeats(game.seats);
      })
      .finally(() => setOnlineLoading(false));

    const sock = io(`${API_BASE_URL}/pool`);
    socketRef.current = sock;
    sock.on('connect', () => sock.emit('join_game', { gameId }));

    sock.on('pool_shoot', (data: { angle: number; power: number }) => {
      // The opponent just shot — replay the identical deterministic
      // simulation locally so both sides see the same animation.
      runShot(data.angle, data.power);
    });

    sock.on('game_updated', (game: any) => {
      // Authoritative snapshot from the server — converge exactly,
      // whether this is our own confirmed result or the opponent's.
      ballsRef.current = game.balls;
      setBalls(game.balls);
      setState(game.state);
    });

    return () => {
      sock.disconnect();
      socketRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, gameId]);

  // ── Wager stake on entry (vs-AI only) ──
  useEffect(() => {
    if (wager > 0 && mode === 'ai') {
      fetchApi('/pool/wager', {
        method: 'POST',
        body: JSON.stringify({ action: 'stake', amount: wager }),
      })
        .then(async res => {
          if (!res.ok) {
            const d = await res.json().catch(() => ({}));
            throw new Error(d.message || 'Could not place wager');
          }
          setWagerNote(`${wager} MSH staked — win to double it`);
        })
        .catch(e => {
          Alert.alert('Wager failed', e.message, [
            { text: 'Play for fun', style: 'default' },
            { text: 'Back', onPress: () => navigation.goBack() },
          ]);
        });
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Wager settlement on game end ──
  useEffect(() => {
    if (state.winner === null || settled.current) return;
    settled.current = true;
    if (wager > 0 && mode === 'ai') {
      if (state.winner === 0) {
        fetchApi('/pool/wager', {
          method: 'POST',
          body: JSON.stringify({ action: 'win', amount: wager }),
        })
          .then(res => res.ok && setWagerNote(`You won ${wager * 2} MSH! 🎉`))
          .catch(() => {});
      } else {
        setWagerNote(`${wager} MSH lost to the house`);
      }
    }
  }, [state.winner, wager, mode]);

  // ── Shot resolution loop ──
  const runShot = useCallback((angle: number, pow: number) => {
    setShooting(true);
    strikeCue(ballsRef.current, angle, pow);
    const events: ShotEvents = { firstHit: null, potted: [], cueScratched: false };

    const tick = () => {
      advance(ballsRef.current, events, 3);
      setBalls([...ballsRef.current]);
      if (ballsMoving(ballsRef.current)) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setState(prev => {
          const { state: next, respot } = applyShot(prev, ballsRef.current, events);
          if (respot || (events.cueScratched && next.winner === null)) {
            respotCue(ballsRef.current);
            setBalls([...ballsRef.current]);
          }
          if (emitResultOnSettle.current && isOnline && gameId && user) {
            emitResultOnSettle.current = false;
            socketRef.current?.emit('pool_result', {
              gameId, userId: user.userId, balls: ballsRef.current, state: next,
            });
          }
          return next;
        });
        setShooting(false);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, gameId, user]);

  // ── AI turn ──
  useEffect(() => {
    if (!isAiTurn || shooting) return;
    const timer = setTimeout(() => {
      const shot = chooseShot(ballsRef.current, state, difficulty);
      setAimAngle(shot.angle);
      setTimeout(() => runShot(shot.angle, shot.power), 450);
    }, 800);
    return () => clearTimeout(timer);
  }, [isAiTurn, shooting, state, difficulty, runShot]);

  const shoot = () => {
    if (isOnline) {
      emitResultOnSettle.current = true;
      socketRef.current?.emit('pool_shoot', { gameId, angle: aimAngle, power });
    }
    runShot(aimAngle, power);
  };

  // ── Touch aiming ──
  // The pan responder always lives on the OUTER, unrotated container, so
  // reported coordinates are never ambiguous. On small screens the table is
  // rotated 90° for display only; aimAt applies the matching inverse
  // rotation itself rather than trusting hit-testing through a transform.
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => aimAt(e.nativeEvent.locationX, e.nativeEvent.locationY),
      onPanResponderMove: (e) => aimAt(e.nativeEvent.locationX, e.nativeEvent.locationY),
    }),
  ).current;

  const aimAt = (px: number, py: number) => {
    if (!canAct) return;
    const cue = ballsRef.current.find(b => b.id === 0);
    if (!cue || cue.potted) return;

    const renderedH = tableWidth * 0.5;
    let u: number, v: number;
    if (isSmallScreen) {
      // Outer touch box is the rotated visual footprint: renderedH wide, tableWidth tall.
      const dxPrime = px - renderedH / 2;
      const dyPrime = py - tableWidth / 2;
      // Inverse of a +90° (clockwise) rotation about the center.
      const dx = dyPrime;
      const dy = -dxPrime;
      u = tableWidth / 2 + dx;
      v = renderedH / 2 + dy;
    } else {
      u = px;
      v = py;
    }

    const scale = TABLE_W / tableWidth;
    const tx = u * scale;
    const ty = v * scale;
    setAimAngle(Math.atan2(ty - cue.y, tx - cue.x));
  };

  // ── Power slider — a vertical bar beside the table. Dragging up increases
  // power (top = 100%), dragging down decreases it (bottom = 0%).
  const powerPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => setPowerFromY(e.nativeEvent.locationY),
      onPanResponderMove: (e) => setPowerFromY(e.nativeEvent.locationY),
    }),
  ).current;
  const powerBarHeight = useRef(200);
  const setPowerFromY = (y: number) =>
    setPower(Math.max(0.1, Math.min(1, 1 - y / powerBarHeight.current)));

  const nameOf = (p: PoolPlayer) => {
    if (mode === 'ai') return p === 0 ? 'You' : `AI (${difficulty})`;
    if (mode === 'online') {
      if (p === mySeat) return 'You';
      const seat = seats.find(s => s.seatIndex === p);
      return seat?.displayName || 'Opponent';
    }
    return p === 0 ? 'Player 1' : 'Player 2';
  };

  const groupLabel = (p: PoolPlayer) => {
    const g = state.groups[p];
    if (!g) return state.openTable ? 'open table' : '—';
    const left = ballsLeft(balls, g);
    const eight = onEight(balls, state, p);
    return eight ? '🎱 on the 8-ball' : `${g} · ${left} left`;
  };

  const restart = () => {
    ballsRef.current = rackBalls();
    setBalls([...ballsRef.current]);
    setState(newPoolState());
    setShooting(false);
    settled.current = false;
    setWagerNote('');
  };

  // Small circular avatar (like Ludo's player corners) instead of a wide
  // card — frees up the row for the board/message to sit between the two
  // players. The active seat's circle gets a pink border; if it's actually
  // your turn to act, that border pulses.
  const renderAvatar = (p: PoolPlayer) => {
    const active = state.turn === p && !state.winner;
    const showPulse = active && canAct;
    return (
      <View style={styles.avatarCol}>
        <View style={styles.avatarWrap}>
          <View style={[styles.avatarCircle, active && styles.avatarCircleActive]}>
            <Ionicons
              name={mode === 'ai' && p === AI_PLAYER ? 'hardware-chip' : 'person'}
              size={20}
              color={active ? '#F472B6' : COLORS.textMuted}
            />
          </View>
          {showPulse && (
            <Animated.View pointerEvents="none" style={[styles.avatarPulseRing, { opacity: pulse }]} />
          )}
        </View>
        <Text style={styles.avatarName} numberOfLines={1}>{nameOf(p)}</Text>
        <Text style={styles.avatarGroup} numberOfLines={1}>{groupLabel(p)}</Text>
      </View>
    );
  };

  if (isOnline && onlineLoading) {
    return (
      <SafeAreaView style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#E53935" />
        <Text style={[TYPOGRAPHY.body2, { marginTop: 14 }]}>Loading table…</Text>
      </SafeAreaView>
    );
  }

  const aimProp = !shooting && !state.winner && (mode !== 'ai' || !isAiTurn) ? { angle: aimAngle } : isAiTurn && !shooting ? { angle: aimAngle } : null;
  const renderedH = tableWidth * 0.5;

  // On small screens the table is rotated 90° purely for display — the
  // pan responder lives on this outer, never-transformed box (sized to the
  // rotated visual footprint) so touch coordinates stay unambiguous; the
  // matching math lives in aimAt() above.
  const tableContent = isSmallScreen ? (
    <View style={{ width: renderedH, height: tableWidth, alignItems: 'center', justifyContent: 'center' }} {...pan.panHandlers}>
      <View style={{ width: tableWidth, height: renderedH, transform: [{ rotate: '90deg' }] }}>
        <PoolTable balls={balls} width={tableWidth} aim={aimProp} />
      </View>
    </View>
  ) : (
    <View style={{ alignItems: 'center' }} {...pan.panHandlers}>
      <PoolTable balls={balls} width={tableWidth} aim={aimProp} />
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <SessionHeaderActions
          navigation={navigation}
          session={{
            id: 'pool',
            label: '8-Ball Pool',
            icon: 'ellipse',
            gradient: GRADIENTS.emerald,
            route: isOnline && gameId
              ? { name: 'Main', params: { screen: 'Life', params: { screen: 'PoolGame', params: { mode: 'online', gameId, wager: 0 } } } }
              : { name: 'Main', params: { screen: 'Life', params: { screen: 'PoolLobby' } } },
          }}
        />
        <Text style={TYPOGRAPHY.h2}>8-Ball Pool</Text>
        {isOnline && opponentSeat?.userId ? (
          <GiftButton
            recipientId={opponentSeat.userId}
            recipientName={opponentSeat.displayName}
            context="game"
            contextId={gameId}
            size={34}
          />
        ) : (
          <TouchableOpacity style={styles.backBtn} onPress={restart}>
            <Ionicons name="refresh" size={20} color={COLORS.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Small profile circles at each end, message pill between them —
          this whole row is much shorter than the old wide cards, so the
          board below gets that space back. */}
      <View style={styles.topRow}>
        {renderAvatar(0)}
        <View style={styles.messageWrap}>
          {canAct && (
            <Animated.View pointerEvents="none" style={[styles.messagePulseBorder, { opacity: pulse }]} />
          )}
          <Text style={styles.statusText} numberOfLines={2}>
            {state.winner !== null
              ? `${nameOf(state.winner)} wins!`
              : shooting
                ? 'Balls rolling…'
                : isAiTurn
                  ? 'AI is lining up…'
                  : isOnline && !isMyOnlineTurn
                    ? `Waiting for ${nameOf(state.turn)}…`
                    : `${nameOf(state.turn)}: aim by touching the table`}
          </Text>
          {wagerNote !== '' && <Text style={styles.wagerText} numberOfLines={1}>{wagerNote}</Text>}
        </View>
        {renderAvatar(1)}
      </View>

      {/* Table gets the lion's share of the screen; power + shoot sit in a
          slim column beside it instead of a row underneath, so aiming has
          maximum unobstructed space. */}
      <View style={styles.playRow}>
        <View style={styles.tableArea}>{tableContent}</View>

        {canAct && (
          <View style={styles.sideControls}>
            <View
              style={styles.vPowerTrack}
              onLayout={e => { powerBarHeight.current = e.nativeEvent.layout.height; }}
              {...powerPan.panHandlers}
            >
              <View style={[styles.vPowerFill, { height: `${power * 100}%` }]} />
            </View>
            <Text style={styles.vPowerPct}>{Math.round(power * 100)}%</Text>
            <TouchableOpacity
              style={[styles.shootIconBtn, shooting && { opacity: 0.4 }]}
              disabled={shooting}
              onPress={shoot}
              accessibilityLabel="Shoot"
            >
              <Ionicons name="radio-button-on" size={28} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {state.winner !== null && (
        <View style={styles.overlay}>
          <LinearGradient colors={['#0B6E3C', '#06371E']} style={styles.overlayCard}>
            <Text style={styles.overlayEmoji}>🎱</Text>
            <Text style={styles.overlayTitle}>{nameOf(state.winner)} wins!</Text>
            <Text style={styles.overlaySub}>{state.winReason}</Text>
            {wagerNote !== '' && <Text style={styles.overlayWager}>{wagerNote}</Text>}
            {!isOnline && (
              <TouchableOpacity style={styles.overlayBtn} onPress={restart}>
                <Text style={styles.overlayBtnText}>Rematch</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.overlayGhost} onPress={() => navigation.goBack()}>
              <Text style={styles.overlayGhostText}>Back to Lobby</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A1F12' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: RADIUS.pill,
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    justifyContent: 'center', alignItems: 'center',
  },
  topRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, gap: 8,
    marginBottom: 4,
  },
  avatarCol: { alignItems: 'center', width: 64 },
  avatarWrap: { width: 44, height: 44 },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5, borderColor: COLORS.glassBorder,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarCircleActive: { borderColor: '#F472B6' },
  avatarPulseRing: {
    position: 'absolute', top: -4, left: -4, right: -4, bottom: -4,
    borderRadius: 26, borderWidth: 2, borderColor: '#F472B6',
  },
  avatarName: { color: COLORS.text, fontWeight: '700', fontSize: 10.5, marginTop: 4, maxWidth: 64, textAlign: 'center' },
  avatarGroup: { color: COLORS.textMuted, fontSize: 9, maxWidth: 64, textAlign: 'center' },
  messageWrap: {
    flex: 1, position: 'relative',
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  messagePulseBorder: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: RADIUS.md, borderWidth: 2, borderColor: '#F472B6',
  },
  statusText: { color: COLORS.text, fontWeight: '600', fontSize: 12.5, textAlign: 'center' },
  wagerText: { color: COLORS.gold, fontSize: 10.5, marginTop: 2, textAlign: 'center' },
  playRow: { flex: 1, flexDirection: 'row' },
  tableArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sideControls: {
    width: 78, alignItems: 'center',
    paddingVertical: SPACING.lg, paddingRight: SPACING.sm,
    gap: 10,
  },
  vPowerTrack: {
    flex: 1, width: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: COLORS.glassBorder,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  vPowerFill: {
    width: '100%',
    backgroundColor: 'rgba(239,68,68,0.65)',
  },
  vPowerPct: { color: COLORS.text, fontWeight: '800', fontSize: 12 },
  shootIconBtn: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#E53935',
    justifyContent: 'center', alignItems: 'center',
  },
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
  overlaySub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 6, textAlign: 'center' },
  overlayWager: { color: COLORS.gold, fontSize: 14, fontWeight: '700', marginTop: 10 },
  overlayBtn: {
    marginTop: 18,
    backgroundColor: '#E53935',
    borderRadius: RADIUS.pill,
    paddingVertical: 12, paddingHorizontal: 36,
  },
  overlayBtnText: { color: '#FFF', fontWeight: '800' },
  overlayGhost: { marginTop: 10, paddingVertical: 8 },
  overlayGhostText: { color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
});
