import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import io, { Socket } from 'socket.io-client';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL, fetchApi } from '../../utils/api';
import { generateTrack, TrackItem, TurboRacingSeatDto, CarUpgrades, DEFAULT_CAR_COLOR } from '@mxit2/types';
import { newSimState, setLaneTarget, stepSim } from '../../games/turboRacing/sim';
import TurboRacingTrack from '../../games/turboRacing/TurboRacingTrack';
import SessionHeaderActions from '../../components/SessionHeaderActions';

const REPORT_INTERVAL_MS = 150;

export default function TurboRacingGameScreen({ navigation, route }: any) {
  const raceId: string = route.params?.raceId;
  const { user } = useAuth();
  const { theme } = useTheme();
  const { TYPOGRAPHY, GRADIENTS } = theme;
  const { width } = useWindowDimensions();
  const trackWidth = Math.min(width - 32, 420);
  const trackHeight = 460;

  const styles = useThemedStyles(({ COLORS, SPACING, RADIUS }) => ({
    root: { flex: 1, backgroundColor: '#0A0A12' },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: RADIUS.pill,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      justifyContent: 'center', alignItems: 'center',
    },
    progressWrap: { paddingHorizontal: SPACING.lg, gap: 6, marginBottom: 8 },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    progressLabel: { color: COLORS.textMuted, fontSize: 11, width: 60 },
    progressTrack: {
      flex: 1, height: 6, borderRadius: 3,
      backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: 3 },
    progressPct: { color: COLORS.textMuted, fontSize: 11, width: 34, textAlign: 'right' },
    trackWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
    leftZone: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '30%' },
    rightZone: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '30%' },
    statusBar: {
      margin: SPACING.lg,
      padding: 12,
      borderRadius: RADIUS.lg,
      backgroundColor: COLORS.surface,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      alignItems: 'center',
    },
    statusText: { color: COLORS.text, fontWeight: '600', fontSize: 13 },
    overlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.75)',
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
    overlayBtn: {
      marginTop: 18,
      backgroundColor: '#E53935',
      borderRadius: RADIUS.pill,
      paddingVertical: 12, paddingHorizontal: 36,
    },
    overlayBtnText: { color: '#FFF', fontWeight: '800' },
  }));

  const [loading, setLoading] = useState(true);
  const [finishDistance, setFinishDistance] = useState(3000);
  const [track, setTrack] = useState<TrackItem[]>([]);
  const [upgrades, setUpgrades] = useState<CarUpgrades>({ speedLevel: 0, accelLevel: 0, handlingLevel: 0, color: DEFAULT_CAR_COLOR });
  const [seats, setSeats] = useState<TurboRacingSeatDto[]>([]);
  const [raceStatus, setRaceStatus] = useState<'active' | 'finished'>('active');

  const [, forceRender] = useState(0);
  const simRef = useRef(newSimState());
  const trackRef = useRef<TrackItem[]>([]);
  const upgradesRef = useRef<CarUpgrades>(upgrades);
  const finishDistanceRef = useRef(finishDistance);
  const socketRef = useRef<Socket | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const lastReportRef = useRef(0);
  const myFinishedReportedRef = useRef(false);

  useEffect(() => { upgradesRef.current = upgrades; }, [upgrades]);
  useEffect(() => { finishDistanceRef.current = finishDistance; }, [finishDistance]);
  useEffect(() => { trackRef.current = track; }, [track]);

  useEffect(() => {
    if (!raceId) return;
    Promise.all([
      fetchApi(`/turbo-racing/${raceId}`).then(res => (res.ok ? res.json() : null)),
      fetchApi('/turbo-racing/upgrades/me').then(res => (res.ok ? res.json() : null)),
    ]).then(([race, up]) => {
      if (race) {
        setFinishDistance(race.finishDistance);
        setTrack(generateTrack(race.seed, race.finishDistance));
        setSeats(race.seats);
        setRaceStatus(race.status);
      }
      if (up) setUpgrades(up);
    }).finally(() => setLoading(false));

    const sock = io(`${API_BASE_URL}/turbo-racing`);
    socketRef.current = sock;
    sock.on('connect', () => sock.emit('join_race', { raceId }));
    sock.on('race_updated', (race: any) => {
      setSeats(race.seats);
      setRaceStatus(race.status);
    });

    return () => {
      sock.disconnect();
      socketRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceId]);

  // ── Local sim loop ──
  useEffect(() => {
    if (loading) return;
    const tick = (t: number) => {
      const last = lastTickRef.current ?? t;
      const dt = Math.min(0.05, (t - last) / 1000);
      lastTickRef.current = t;

      const sim = simRef.current;
      if (!sim.finished) {
        stepSim(sim, dt, upgradesRef.current, trackRef.current, finishDistanceRef.current);
      }

      if (t - lastReportRef.current > REPORT_INTERVAL_MS && user?.userId) {
        lastReportRef.current = t;
        socketRef.current?.emit('report_progress', {
          raceId, userId: user.userId,
          distance: sim.distance, lane: sim.lanePos, crashed: sim.crashTimer > 0, coins: sim.coins,
        });
        if (sim.finished && !myFinishedReportedRef.current) {
          myFinishedReportedRef.current = true;
        }
      }

      forceRender(n => n + 1);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, raceId]);

  const mySeat = seats.find(s => s.userId === user?.userId);
  const opponentSeats = seats.filter(s => s.userId !== user?.userId);

  const ghosts = useMemo(
    () => opponentSeats.map(s => ({ distance: s.distance, lane: s.lane, displayName: s.displayName, crashed: s.crashed, color: s.color })),
    [opponentSeats],
  );

  const sim = simRef.current;
  const progressPct = Math.min(100, Math.round((sim.distance / finishDistance) * 100));

  const raceOver = raceStatus === 'finished';
  const myRank = mySeat?.rank ?? null;

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#E53935" />
        <Text style={[TYPOGRAPHY.body2, { marginTop: 14 }]}>Loading race…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <SessionHeaderActions
          navigation={navigation}
          session={{
            id: 'racing',
            label: 'Turbo Racing',
            icon: 'speedometer',
            gradient: GRADIENTS.crimson,
            route: raceId
              ? { name: 'Main', params: { screen: 'Life', params: { screen: 'TurboRacingGame', params: { raceId } } } }
              : { name: 'Main', params: { screen: 'Life', params: { screen: 'TurboRacingLobby' } } },
          }}
        />
        <Text style={TYPOGRAPHY.h2}>Turbo Racing</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.progressWrap}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>You</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: '#8B5CF6' }]} />
          </View>
          <Text style={styles.progressPct}>{progressPct}%</Text>
        </View>
        {opponentSeats.map((s, i) => (
          <View style={styles.progressRow} key={i}>
            <Text style={styles.progressLabel} numberOfLines={1}>{s.displayName}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, Math.round((s.distance / finishDistance) * 100))}%`, backgroundColor: '#F472B6' }]} />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.trackWrap}>
        <TurboRacingTrack
          myDistance={sim.distance}
          myLane={sim.lanePos}
          myColor={upgrades.color}
          crashed={sim.crashTimer > 0}
          boosted={sim.boostTimer > 0}
          track={track}
          ghosts={ghosts}
          width={trackWidth}
          height={trackHeight}
        />

        {!sim.finished && (
          <>
            <Pressable style={styles.leftZone} onPress={() => setLaneTarget(simRef.current, -1)} />
            <Pressable style={styles.rightZone} onPress={() => setLaneTarget(simRef.current, 1)} />
          </>
        )}
      </View>

      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {sim.finished
            ? myRank !== null
              ? `You finished #${myRank}! Waiting for the race to end…`
              : 'Finished! Waiting for results…'
            : sim.crashTimer > 0
              ? 'Crashed! Slowing down…'
              : sim.boostTimer > 0
                ? 'Boosted!'
                : `${Math.round(sim.speed)} m/s · ${sim.coins} coins`}
        </Text>
      </View>

      {raceOver && (
        <View style={styles.overlay}>
          <LinearGradient colors={['#7F1D1D', '#2E0A0A']} style={styles.overlayCard}>
            <Text style={styles.overlayEmoji}>{myRank === 1 ? '🏆' : '🏁'}</Text>
            <Text style={styles.overlayTitle}>{myRank === 1 ? 'You won!' : `You placed #${myRank ?? '-'}`}</Text>
            <Text style={styles.overlaySub}>
              {mySeat?.coins ?? 0} coins collected · race paid out to your wallet
            </Text>
            <TouchableOpacity style={styles.overlayBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.overlayBtnText}>Back to Lobby</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
    </SafeAreaView>
  );
}
