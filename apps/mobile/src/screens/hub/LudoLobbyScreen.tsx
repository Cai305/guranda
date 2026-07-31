import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import io, { Socket } from 'socket.io-client';
import { LUDO_MODES, LudoMode, SEAT_COLORS } from '@mxit2/types';
import { RADIUS, GRADIENTS } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../utils/api';
import SessionHeaderActions from '../../components/SessionHeaderActions';

const BG = '#1E0A38';
const GOLD = '#F2C21F';
const CARD_BG: [string, string] = ['#3A0E6E', '#200840'];
const CARD_BG_ACTIVE: [string, string] = ['#5A1EA8', '#3A0E6E'];

// Each entry: mode key, display label, large number, which seat colours to preview
const BIG_CARDS: { mode: LudoMode; label: string; num: string; seats: number[] }[] = [
  { mode: '1v1', label: '2 Player', num: '2', seats: [0, 2] },
  { mode: '2v2', label: '4 Player', num: '4', seats: [0, 1, 2, 3] },
];

const SMALL_CARDS: { mode: LudoMode; label: string; seats: number[] }[] = [
  { mode: '2v2v2', label: '2v2v2', seats: [0, 1, 2] },
  { mode: '4v4',   label: '4 vs 4', seats: [0, 1, 2, 3] },
  { mode: '1v5',   label: '1 vs 5', seats: [0, 1, 2] },
];

export default function LudoLobbyScreen({ navigation }: any) {
  const { user } = useAuth();
  const [selectedMode, setSelectedMode] = useState<LudoMode>('1v1');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [searching, setSearching] = useState(false);
  const [startingAI, setStartingAI] = useState(false);
  const [aiTarget, setAiTarget] = useState<LudoMode | null>(null);

  useEffect(() => {
    const sock = io(`${API_BASE_URL}/ludo`);
    setSocket(sock);

    sock.on('game_created', (data: { gameId: string }) => {
      setStartingAI(false);
      setAiTarget(null);
      navigation.navigate('LudoGame', { gameId: data.gameId, mySeat: 0 });
    });

    sock.on('match_found', (data: { gameId: string }) => {
      setSearching(false);
      navigation.navigate('LudoGame', { gameId: data.gameId });
    });

    return () => { sock.disconnect(); };
  }, [navigation]);

  const displayName = user?.displayName || user?.username || 'Player';
  const busy = searching || startingAI;

  const playVsAI = (mode: LudoMode) => {
    if (!socket || !user || busy) return;
    setSelectedMode(mode);
    setStartingAI(true);
    setAiTarget(mode);
    socket.emit('start_ai_game', { mode, userId: user.userId, displayName });
  };

  const findOnline = () => {
    if (!socket || !user || busy) return;
    setSearching(true);
    socket.emit('join_queue', { mode: selectedMode, userId: user.userId, displayName });
  };

  const cancelSearch = () => {
    socket?.emit('leave_queue');
    setSearching(false);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <SessionHeaderActions
          navigation={navigation}
          session={{
            id: 'ludo',
            label: 'Ludo',
            icon: 'dice',
            gradient: GRADIENTS.sunset,
            route: { name: 'Main', params: { screen: 'Life', params: { screen: 'LudoLobby' } } },
          }}
        />
        <Text style={styles.headerTitle}>LUDO</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Big mode cards ── */}
        <View style={styles.bigRow}>
          {BIG_CARDS.map(({ mode, label, num, seats }) => {
            const active = selectedMode === mode;
            const loading = startingAI && aiTarget === mode;
            return (
              <View key={mode} style={styles.bigCardWrap}>
                {/* Gold outer border ring */}
                <LinearGradient
                  colors={active ? [GOLD, '#C49A0C'] : ['rgba(242,194,31,0.35)', 'rgba(196,154,12,0.35)']}
                  style={styles.bigCardBorder}
                >
                  <LinearGradient colors={active ? CARD_BG_ACTIVE : CARD_BG} style={styles.bigCardInner}>
                    {/* Large number */}
                    <Text style={[styles.bigNum, active && { color: GOLD }]}>{num}</Text>

                    {/* Token dot grid */}
                    <View style={styles.dotGrid}>
                      {seats.map(s => (
                        <View
                          key={s}
                          style={[styles.bigDot, { backgroundColor: SEAT_COLORS[s] }]}
                        />
                      ))}
                    </View>

                    {/* Label */}
                    <Text style={styles.bigLabel}>{label}</Text>

                    {/* PLAY button */}
                    <TouchableOpacity
                      style={styles.playBtn}
                      onPress={() => playVsAI(mode)}
                      disabled={busy}
                      activeOpacity={0.85}
                    >
                      <LinearGradient
                        colors={[GOLD, '#C49A0C']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.playBtnGrad}
                      >
                        {loading
                          ? <ActivityIndicator color="#1E0A38" size="small" />
                          : <Text style={styles.playBtnText}>PLAY</Text>}
                      </LinearGradient>
                    </TouchableOpacity>
                  </LinearGradient>
                </LinearGradient>
              </View>
            );
          })}
        </View>

        {/* ── Small mode cards ── */}
        <View style={styles.smallRow}>
          {SMALL_CARDS.map(({ mode, label, seats }) => {
            const active = selectedMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                style={styles.smallCardWrap}
                onPress={() => setSelectedMode(mode)}
                activeOpacity={0.85}
                disabled={busy}
              >
                <LinearGradient
                  colors={active ? ['rgba(242,194,31,0.5)', 'rgba(196,154,12,0.5)'] : ['rgba(242,194,31,0.15)', 'rgba(196,154,12,0.15)']}
                  style={styles.smallCardBorder}
                >
                  <LinearGradient colors={active ? CARD_BG_ACTIVE : CARD_BG} style={styles.smallCardInner}>
                    {/* Mini token dots */}
                    <View style={styles.smallDotRow}>
                      {seats.map(s => (
                        <View
                          key={s}
                          style={[styles.smallDot, { backgroundColor: SEAT_COLORS[s] }]}
                        />
                      ))}
                    </View>
                    <Text style={[styles.smallLabel, active && { color: GOLD }]} numberOfLines={2}>
                      {label}
                    </Text>
                  </LinearGradient>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Online match button ── */}
        <View style={styles.bottomBtns}>
          <TouchableOpacity
            style={[styles.onlineBtn, busy && styles.btnDisabled]}
            onPress={searching ? cancelSearch : findOnline}
            disabled={startingAI}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={searching ? ['#444', '#333'] : ['#6B21A8', '#4C1D95']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.onlineBtnGrad}
            >
              {searching ? (
                <>
                  <ActivityIndicator color={GOLD} size="small" />
                  <Text style={styles.onlineBtnText}>Searching… Tap to cancel</Text>
                </>
              ) : (
                <>
                  <Ionicons name="globe-outline" size={20} color={GOLD} />
                  <Text style={styles.onlineBtnText}>
                    Find Match · {LUDO_MODES[selectedMode].label}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: GOLD,
    letterSpacing: 4,
  },
  scroll: { paddingBottom: 40 },

  // Big cards
  bigRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 6,
  },
  bigCardWrap: { flex: 1 },
  bigCardBorder: {
    borderRadius: RADIUS.lg,
    padding: 2,
  },
  bigCardInner: {
    borderRadius: RADIUS.lg - 2,
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 12,
  },
  bigNum: {
    fontSize: 60,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 64,
  },
  dotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    width: 56,
  },
  bigDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  bigLabel: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  playBtn: { width: '100%', marginTop: 4 },
  playBtnGrad: {
    borderRadius: RADIUS.pill,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
  },
  playBtnText: {
    color: '#1E0A38',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1.5,
  },

  // Small cards
  smallRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  smallCardWrap: { flex: 1 },
  smallCardBorder: {
    borderRadius: RADIUS.md,
    padding: 1.5,
  },
  smallCardInner: {
    borderRadius: RADIUS.md - 2,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 8,
  },
  smallDotRow: { flexDirection: 'row', gap: 4, justifyContent: 'center' },
  smallDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  smallLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '700',
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  // Bottom
  bottomBtns: {
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 12,
  },
  onlineBtn: { borderRadius: RADIUS.pill, overflow: 'hidden' },
  onlineBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  onlineBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.6 },
});
