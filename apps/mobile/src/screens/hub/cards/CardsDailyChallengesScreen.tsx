import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../../theme';
import { fetchApi } from '../../../utils/api';

export default function CardsDailyChallengesScreen({ navigation }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchApi('/daily-challenges')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => Array.isArray(data) && setItems(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const claim = async (challengeId: string) => {
    setClaiming(challengeId);
    try {
      const res = await fetchApi(`/daily-challenges/${challengeId}/claim`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to claim');
      const data = await res.json();
      Alert.alert('Reward claimed', `+${data.rewarded} MSH`);
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setClaiming(null);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Daily Challenges</Text>
        <View style={{ width: 36 }} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => i.challenge.id}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
        renderItem={({ item }) => {
          const criteria = item.challenge.criteria;
          const progress = item.progress?.progress ?? 0;
          const completed = item.progress?.completed ?? false;
          const claimed = !!item.progress?.claimedAt;
          const pct = Math.min(1, progress / (criteria.target || 1));
          return (
            <View style={styles.card}>
              <Text style={styles.desc}>{item.challenge.description}</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
              </View>
              <View style={styles.footerRow}>
                <Text style={styles.progressText}>{progress}/{criteria.target}</Text>
                <Text style={styles.reward}>+{item.challenge.rewardMasheleni} MSH</Text>
              </View>
              {completed && !claimed && (
                <TouchableOpacity style={styles.claimBtn} onPress={() => claim(item.challenge.id)} disabled={claiming === item.challenge.id}>
                  {claiming === item.challenge.id ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.claimBtnText}>Claim Reward</Text>}
                </TouchableOpacity>
              )}
              {claimed && <Text style={styles.claimedText}>Claimed ✓</Text>}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: SPACING.xl }}>
            {loading ? <ActivityIndicator color={COLORS.primary} /> : <Text style={{ color: COLORS.textMuted }}>No challenges today.</Text>}
          </View>
        }
      />
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
  card: {
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, gap: 8,
  },
  desc: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: COLORS.surfaceElevated, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { color: COLORS.textMuted, fontSize: 12 },
  reward: { color: COLORS.gold, fontWeight: '800', fontSize: 12 },
  claimBtn: { backgroundColor: COLORS.success, borderRadius: RADIUS.pill, paddingVertical: 10, alignItems: 'center' },
  claimBtnText: { color: '#fff', fontWeight: '800' },
  claimedText: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center' },
});
