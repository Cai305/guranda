import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import io, { Socket } from 'socket.io-client';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, GRADIENTS } from '../../../theme';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE_URL } from '../../../utils/api';
import SessionHeaderActions from '../../../components/SessionHeaderActions';

type Difficulty = 'easy' | 'medium' | 'hard';
const DIFFICULTIES: { key: Difficulty; label: string }[] = [
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
];
const TARGET_SCORES = [11, 21, 31, 51];

export default function CassinoLobbyScreen({ navigation }: any) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [targetScore, setTargetScore] = useState(11);
  const [startingAI, setStartingAI] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const sock = io(`${API_BASE_URL}/cards`);
    setSocket(sock);
    sock.on('game_created', (data: { gameId: string }) => {
      setStartingAI(false);
      navigation.navigate('CassinoGame', { gameId: data.gameId });
    });
    sock.on('match_found', (data: { gameId: string }) => {
      setSearching(false);
      navigation.navigate('CassinoGame', { gameId: data.gameId });
    });
    return () => { sock.disconnect(); };
  }, [navigation]);

  const displayName = user?.displayName || user?.username || 'Player';
  const busy = startingAI || searching;

  const playVsAI = () => {
    if (!socket || !user || busy) return;
    setStartingAI(true);
    socket.emit('start_ai_game', {
      mode: 'CASSINO',
      userId: user.userId,
      displayName,
      difficulty,
      cassinoMode: 'ONE_V_ONE',
      targetScore,
    });
  };

  const findOnline = () => {
    if (!socket || !user || busy) return;
    setSearching(true);
    socket.emit('join_queue', { mode: 'CASSINO', userId: user.userId, displayName });
  };

  const cancelSearch = () => {
    socket?.emit('leave_queue');
    setSearching(false);
  };

  const playOffline = () => {
    navigation.navigate('CassinoGame', { offline: true, difficulty, targetScore });
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <SessionHeaderActions
          navigation={navigation}
          session={{
            id: 'cassino',
            label: 'Cassino',
            icon: 'grid',
            gradient: GRADIENTS.golden,
            route: { name: 'Main', params: { screen: 'Life', params: { screen: 'CassinoLobby' } } },
          }}
        />
        <Text style={TYPOGRAPHY.h2}>Cassino</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Target Score</Text>
        <View style={styles.chipRow}>
          {TARGET_SCORES.map((score) => (
            <TouchableOpacity
              key={score}
              style={[styles.chip, targetScore === score && styles.chipActive]}
              onPress={() => setTargetScore(score)}
            >
              <Text style={[styles.chipText, targetScore === score && styles.chipTextActive]}>{score}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>AI Difficulty</Text>
        <View style={styles.chipRow}>
          {DIFFICULTIES.map((d) => (
            <TouchableOpacity
              key={d.key}
              style={[styles.chip, difficulty === d.key && styles.chipActive]}
              onPress={() => setDifficulty(d.key)}
            >
              <Text style={[styles.chipText, difficulty === d.key && styles.chipTextActive]}>{d.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={playVsAI} disabled={busy}>
          <LinearGradient colors={GRADIENTS.golden} style={styles.primaryBtnGrad}>
            {startingAI ? <ActivityIndicator color="#1E0A38" /> : (
              <>
                <Ionicons name="hardware-chip" size={18} color="#1E0A38" />
                <Text style={styles.primaryBtnText}>Play vs AI (1v1)</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, searching && styles.secondaryBtnActive]}
          onPress={searching ? cancelSearch : findOnline}
          disabled={startingAI}
        >
          {searching ? (
            <>
              <ActivityIndicator color={COLORS.primary} size="small" />
              <Text style={styles.secondaryBtnText}>Searching… tap to cancel</Text>
            </>
          ) : (
            <>
              <Ionicons name="globe-outline" size={18} color={COLORS.primary} />
              <Text style={styles.secondaryBtnText}>Find Online Match (1v1)</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.tertiaryBtn} onPress={() => navigation.navigate('CardsHome')}>
          <Ionicons name="people" size={16} color={COLORS.textMuted} />
          <Text style={styles.tertiaryBtnText}>2v2 partners, free-for-all & rooms</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tertiaryBtn} onPress={playOffline}>
          <Ionicons name="airplane" size={16} color={COLORS.textMuted} />
          <Text style={styles.tertiaryBtnText}>Offline practice (no network)</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  content: { padding: SPACING.lg, gap: SPACING.md },
  sectionLabel: { ...TYPOGRAPHY.label, marginBottom: 4 },
  chipRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  chip: {
    flex: 1, minWidth: 60, paddingVertical: 10, borderRadius: RADIUS.pill,
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    alignItems: 'center',
  },
  chipActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  chipText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 13 },
  chipTextActive: { color: '#1E0A38' },
  primaryBtn: { borderRadius: RADIUS.pill, overflow: 'hidden', marginTop: SPACING.sm },
  primaryBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16,
  },
  primaryBtnText: { color: '#1E0A38', fontWeight: '800', fontSize: 15 },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: RADIUS.pill,
    borderWidth: 1, borderColor: COLORS.primary,
  },
  secondaryBtnActive: { opacity: 0.8 },
  secondaryBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  tertiaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  tertiaryBtnText: { color: COLORS.textMuted, fontWeight: '600', fontSize: 13 },
});
