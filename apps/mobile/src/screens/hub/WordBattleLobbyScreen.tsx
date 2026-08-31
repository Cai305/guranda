import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import io, { Socket } from 'socket.io-client';
import { WordBattleMode, WordBattleDifficulty } from '@mxit2/types';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL, fetchApi } from '../../utils/api';
import SessionHeaderActions from '../../components/SessionHeaderActions';

const MODES: { key: WordBattleMode; label: string; emoji: string; blurb: string; screen: string; gradient: [string, string] }[] = [
  { key: 'WORDLE', label: 'Wordle Duel', emoji: '🟩', blurb: 'Race to guess the secret word — fewest guesses wins', screen: 'WordleDuel', gradient: ['#16A34A', '#065F46'] },
  { key: 'BOGGLE', label: 'Boggle', emoji: '🔤', blurb: 'Trace words on a shared grid before the timer runs out', screen: 'Boggle', gradient: ['#7C3AED', '#4C1D95'] },
  { key: 'SCRABBLE', label: 'Scrabble', emoji: '🁢', blurb: 'Classic tile-placement word battle, turn by turn', screen: 'Scrabble', gradient: ['#D97706', '#92400E'] },
];

const DIFFICULTIES: { key: WordBattleDifficulty; label: string }[] = [
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
];

const WAGERS = [0, 10, 25, 50];

export default function WordBattleLobbyScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY, GRADIENTS } = theme;
  const { user } = useAuth();
  const [mode, setMode] = useState<WordBattleMode>('WORDLE');
  const [difficulty, setDifficulty] = useState<WordBattleDifficulty>('medium');
  const [wager, setWager] = useState(0);
  const [balance, setBalance] = useState<number | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [searching, setSearching] = useState(false);
  const [startingAI, setStartingAI] = useState(false);

  useEffect(() => {
    fetchApi('/wallets/me')
      .then(res => (res.ok ? res.json() : null))
      .then(w => w && setBalance(Math.floor(w.balanceMasheleni)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const sock = io(`${API_BASE_URL}/wordbattle`);
    setSocket(sock);

    sock.on('game_created', (data: { gameId: string }) => {
      setStartingAI(false);
      const active = MODES.find(m => m.key === mode)!;
      navigation.navigate(active.screen, { gameId: data.gameId, wager });
    });
    sock.on('match_found', (data: { gameId: string }) => {
      setSearching(false);
      const active = MODES.find(m => m.key === mode)!;
      navigation.navigate(active.screen, { gameId: data.gameId, wager: 0 });
    });

    return () => { sock.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const busy = searching || startingAI;
  const displayName = user?.displayName || user?.username || 'Player';
  const activeMode = MODES.find(m => m.key === mode)!;

  const playVsAI = () => {
    if (!socket || !user || busy) return;
    setStartingAI(true);
    socket.emit('start_ai_game', { mode, userId: user.userId, displayName, difficulty });
  };

  const findOnline = () => {
    if (!socket || !user || busy) return;
    setSearching(true);
    socket.emit('join_queue', { mode, userId: user.userId, displayName });
  };

  const cancelSearch = () => {
    socket?.emit('leave_queue');
    setSearching(false);
  };

  const styles = useThemedStyles(({ COLORS, SPACING, RADIUS, TYPOGRAPHY }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: RADIUS.pill,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      justifyContent: 'center', alignItems: 'center',
    },
    sectionLabel: {
      ...TYPOGRAPHY.label, fontSize: 11,
      paddingHorizontal: SPACING.lg,
      marginTop: SPACING.xl, marginBottom: SPACING.md,
    },
    modeStack: { paddingHorizontal: SPACING.lg, gap: 10 },
    modeCard: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      borderRadius: RADIUS.lg, padding: 16,
      borderWidth: 1, borderColor: COLORS.glassBorder,
    },
    modeCardActive: { borderColor: 'rgba(255,255,255,0.3)' },
    modeEmoji: { fontSize: 32 },
    modeLabel: { color: COLORS.text, fontWeight: '800', fontSize: 16 },
    modeBlurb: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
    diffRow: { flexDirection: 'row', gap: 10, paddingHorizontal: SPACING.lg },
    diffCard: {
      flex: 1, backgroundColor: 'rgba(255,255,255,0.06)',
      borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.glassBorder,
      paddingVertical: 12, alignItems: 'center',
    },
    diffCardActive: { borderColor: '#0EA5E9', backgroundColor: 'rgba(14,165,233,0.15)' },
    diffLabel: { color: COLORS.textMuted, fontWeight: '800', fontSize: 14 },
    wagerRow: { flexDirection: 'row', gap: 10, paddingHorizontal: SPACING.lg },
    wagerChip: {
      flex: 1, backgroundColor: 'rgba(255,255,255,0.06)',
      borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.glassBorder,
      paddingVertical: 11, alignItems: 'center',
    },
    wagerChipActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
    wagerText: { color: COLORS.textMuted, fontWeight: '800', fontSize: 13 },
    playBtn: {
      flexDirection: 'row', gap: 10,
      marginHorizontal: SPACING.lg, marginTop: SPACING.md,
      backgroundColor: '#7C3AED',
      borderRadius: RADIUS.pill, paddingVertical: 14,
      justifyContent: 'center', alignItems: 'center',
    },
    playText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  }));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <SessionHeaderActions
            navigation={navigation}
            session={{
              id: 'word-battle',
              label: 'Word Battle',
              icon: 'text',
              gradient: GRADIENTS.emerald,
              route: { name: 'Main', params: { screen: 'Life', params: { screen: 'WordBattleLobby' } } },
            }}
          />
          <Text style={TYPOGRAPHY.h2}>Word Battle</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.sectionLabel}>CHOOSE YOUR GAME</Text>
        <View style={styles.modeStack}>
          {MODES.map(m => {
            const active = mode === m.key;
            return (
              <TouchableOpacity key={m.key} activeOpacity={0.85} disabled={busy} onPress={() => setMode(m.key)}>
                <LinearGradient
                  colors={active ? m.gradient : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.03)']}
                  style={[styles.modeCard, active && styles.modeCardActive]}
                >
                  <Text style={styles.modeEmoji}>{m.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modeLabel}>{m.label}</Text>
                    <Text style={styles.modeBlurb}>{m.blurb}</Text>
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={22} color="#FFF" />}
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>VS AI DIFFICULTY</Text>
        <View style={styles.diffRow}>
          {DIFFICULTIES.map(d => (
            <TouchableOpacity
              key={d.key}
              style={[styles.diffCard, difficulty === d.key && styles.diffCardActive]}
              onPress={() => setDifficulty(d.key)}
              disabled={busy}
            >
              <Text style={[styles.diffLabel, difficulty === d.key && { color: COLORS.text }]}>{d.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>
          WAGER {balance !== null ? `· BALANCE ${balance} MSH` : ''}
        </Text>
        <View style={styles.wagerRow}>
          {WAGERS.map(w => (
            <TouchableOpacity
              key={w}
              style={[styles.wagerChip, wager === w && styles.wagerChipActive]}
              onPress={() => setWager(w)}
              disabled={busy}
            >
              <Text style={[styles.wagerText, wager === w && { color: '#1A1200' }]}>
                {w === 0 ? 'For fun' : `${w} MSH`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.playBtn} onPress={playVsAI} disabled={busy}>
          {startingAI ? <ActivityIndicator color="#FFF" /> : (
            <>
              <Ionicons name="hardware-chip-outline" size={20} color="#FFF" />
              <Text style={styles.playText}>Play vs AI — {activeMode.label}</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>PLAYER VS PLAYER</Text>
        <TouchableOpacity
          style={[styles.playBtn, { backgroundColor: searching ? '#333' : '#0EA5E9' }]}
          onPress={searching ? cancelSearch : findOnline}
          disabled={startingAI}
        >
          {searching ? (
            <>
              <ActivityIndicator color={COLORS.gold} size="small" />
              <Text style={styles.playText}>Searching… tap to cancel</Text>
            </>
          ) : (
            <>
              <Ionicons name="globe-outline" size={20} color="#FFF" />
              <Text style={styles.playText}>Find an opponent — {activeMode.label}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
