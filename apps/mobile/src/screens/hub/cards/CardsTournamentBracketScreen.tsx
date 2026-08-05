import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { useAuth } from '../../../context/AuthContext';
import { fetchApi } from '../../../utils/api';

export default function CardsTournamentBracketScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { tournamentId } = route.params;
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchApi(`/cards-tournaments/${tournamentId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setTournament)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tournamentId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const register = async () => {
    setBusy(true);
    try {
      const res = await fetchApi(`/cards-tournaments/${tournamentId}/register`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json())?.message || 'Failed to register');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    setBusy(true);
    try {
      const res = await fetchApi(`/cards-tournaments/${tournamentId}/start`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json())?.message || 'Failed to start');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(false);
    }
  };

  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY, SPACING } = theme;

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, RADIUS, SPACING }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    meta: { color: COLORS.textMuted, textAlign: 'center', fontSize: 12, marginBottom: SPACING.sm },
    actionRow: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
    actionBtn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.pill, backgroundColor: COLORS.primary, alignItems: 'center' },
    startBtn: { backgroundColor: COLORS.gold },
    actionBtnText: { color: '#fff', fontWeight: '800' },
    entriesCard: { backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder, borderRadius: RADIUS.md, padding: SPACING.md, gap: 4 },
    sectionLabel: { ...TYPOGRAPHY.label, marginBottom: 6 },
    entryName: { color: COLORS.text, fontSize: 13 },
    roundBlock: { marginBottom: SPACING.md },
    matchupRow: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.sm, padding: SPACING.sm, marginBottom: 6,
    },
    playerName: { flex: 1, color: COLORS.textMuted, fontSize: 13 },
    winnerName: { color: COLORS.gold, fontWeight: '800' },
    vsText: { color: COLORS.textMuted, fontSize: 11 },
  }));

  if (loading || !tournament) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  const isCreator = tournament.createdById === user?.userId;
  const alreadyRegistered = tournament.entries?.some((e: any) => e.userId === user?.userId);
  const entryById = new Map<string, any>(tournament.entries.map((e: any) => [e.id, e]));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h3} numberOfLines={1}>{tournament.name}</Text>
        <View style={{ width: 36 }} />
      </View>

      <Text style={styles.meta}>{tournament.status.toUpperCase()} · {tournament.entries.length}/{tournament.maxPlayers} players</Text>

      {tournament.status === 'registration' && (
        <View style={styles.actionRow}>
          {!alreadyRegistered && (
            <TouchableOpacity style={styles.actionBtn} onPress={register} disabled={busy}>
              <Text style={styles.actionBtnText}>Register</Text>
            </TouchableOpacity>
          )}
          {isCreator && (
            <TouchableOpacity style={[styles.actionBtn, styles.startBtn]} onPress={start} disabled={busy}>
              <Text style={styles.actionBtnText}>Start Tournament</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
        {tournament.rounds.length === 0 && (
          <View style={styles.entriesCard}>
            <Text style={styles.sectionLabel}>Registered Players</Text>
            {tournament.entries.map((e: any) => (
              <Text key={e.id} style={styles.entryName}>{e.user?.profile?.displayName || e.user?.username}</Text>
            ))}
          </View>
        )}
        {tournament.rounds.map((round: any) => (
          <View key={round.id} style={styles.roundBlock}>
            <Text style={styles.sectionLabel}>Round {round.roundNumber}</Text>
            {(round.matchups as any[]).map((m, i) => {
              const a = entryById.get(m.entryAId);
              const b = m.entryBId ? entryById.get(m.entryBId) : null;
              return (
                <View key={i} style={styles.matchupRow}>
                  <Text style={[styles.playerName, m.winnerEntryId === m.entryAId && styles.winnerName]}>
                    {a?.user?.profile?.displayName || a?.user?.username}
                  </Text>
                  <Text style={styles.vsText}>vs</Text>
                  <Text style={[styles.playerName, m.winnerEntryId === m.entryBId && styles.winnerName]}>
                    {b ? (b.user?.profile?.displayName || b.user?.username) : 'BYE'}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
