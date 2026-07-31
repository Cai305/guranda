import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PlayingCard from '../../../components/cards/PlayingCard';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../../theme';
import { fetchApi } from '../../../utils/api';

export default function CardsReplayViewerScreen({ route, navigation }: any) {
  const { gameId } = route.params;
  const [moves, setMoves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    fetchApi(`/cards/${gameId}/moves`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setMoves(data);
          setIndex(Math.max(0, data.length - 1));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [gameId]);

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (moves.length === 0) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={TYPOGRAPHY.h3}>Replay</Text>
          <View style={{ width: 36 }} />
        </View>
        <Text style={{ color: COLORS.textMuted, textAlign: 'center', marginTop: 40 }}>No moves recorded for this game.</Text>
      </SafeAreaView>
    );
  }

  const move = moves[index];
  const state = move.stateSnapshot;
  const isCassino = 'table' in state;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h3}>Replay — move {index + 1}/{moves.length}</Text>
        <View style={{ width: 36 }} />
      </View>

      <Text style={styles.moveDesc}>Seat {move.seatIndex} played: {move.action}</Text>

      <ScrollView contentContainerStyle={styles.board}>
        {isCassino ? (
          <>
            <Text style={styles.sectionLabel}>Table</Text>
            <View style={styles.row}>
              {state.table.map((c: any, i: number) => (
                <PlayingCard key={i} suit={c.suit} rank={c.rank} size="sm" />
              ))}
              {state.table.length === 0 && <Text style={styles.emptyText}>Empty</Text>}
            </View>
            <Text style={styles.sectionLabel}>Builds</Text>
            <View style={styles.row}>
              {state.builds.map((b: any) => (
                <View key={b.id} style={styles.buildChip}>
                  <Text style={styles.buildValue}>{b.value}</Text>
                </View>
              ))}
              {state.builds.length === 0 && <Text style={styles.emptyText}>None</Text>}
            </View>
            {state.seats.map((s: any) => (
              <View key={s.seatIndex} style={styles.seatBlock}>
                <Text style={styles.seatName}>{s.displayName} — {s.hand.length} in hand, {s.capturedPile.length} captured</Text>
              </View>
            ))}
          </>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Discard Pile Top</Text>
            <View style={styles.row}>
              {state.discardPile[0] && <PlayingCard suit={state.discardPile[0].suit} rank={state.discardPile[0].rank} size="md" />}
            </View>
            {state.seats.map((s: any) => (
              <View key={s.seatIndex} style={styles.seatBlock}>
                <Text style={styles.seatName}>{s.displayName}</Text>
                <View style={styles.row}>
                  {s.hand.map((c: any, i: number) => (
                    <PlayingCard key={i} suit={c.suit} rank={c.rank} isJoker={c.isJoker} size="sm" />
                  ))}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtn} onPress={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
          <Ionicons name="play-back" size={20} color={index === 0 ? COLORS.textMuted : COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.controlBtn}
          onPress={() => setIndex((i) => Math.min(moves.length - 1, i + 1))}
          disabled={index === moves.length - 1}
        >
          <Ionicons name="play-forward" size={20} color={index === moves.length - 1 ? COLORS.textMuted : COLORS.text} />
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
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  moveDesc: { color: COLORS.textMuted, textAlign: 'center', fontSize: 12, marginBottom: SPACING.sm },
  board: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  sectionLabel: { ...TYPOGRAPHY.label },
  row: { flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' },
  emptyText: { color: COLORS.textMuted, fontSize: 12 },
  buildChip: { backgroundColor: COLORS.glass, borderRadius: RADIUS.sm, padding: SPACING.sm },
  buildValue: { color: COLORS.gold, fontWeight: '800' },
  seatBlock: { marginTop: SPACING.sm, gap: 4 },
  seatName: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.xl, paddingVertical: SPACING.md },
  controlBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.glass, alignItems: 'center', justifyContent: 'center' },
});
