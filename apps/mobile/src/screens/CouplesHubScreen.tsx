import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';

type SpiceLevel = 'SWEET' | 'FLIRTY' | 'SPICY';

const SPICE_LEVELS: { key: SpiceLevel; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'SWEET', label: 'Sweet', icon: 'happy' },
  { key: 'FLIRTY', label: 'Flirty', icon: 'flame' },
  { key: 'SPICY', label: 'Spicy', icon: 'bonfire' },
];

export default function CouplesHubScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY, SPACING } = theme;
  const [summary, setSummary] = useState<any>(null);
  const [spice, setSpice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingLevel, setSavingLevel] = useState(false);
  const [savingOptIn, setSavingOptIn] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchApi('/couples/challenges').then((r) => (r.ok ? r.json() : null)),
      fetchApi('/couples/spice-settings').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([challenges, spiceSettings]) => {
        setSummary(challenges);
        setSpice(spiceSettings);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const chooseLevel = async (level: SpiceLevel) => {
    if (savingLevel || spice?.spiceLevel === level) return;
    setSavingLevel(true);
    try {
      const res = await fetchApi('/couples/spice-level', { method: 'POST', body: JSON.stringify({ level }) });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.message || 'Could not change spice level');
      }
      setSpice(await res.json());
    } catch (e: any) {
      Alert.alert('Spicy content locked', e.message);
    } finally {
      setSavingLevel(false);
    }
  };

  const toggleOptIn = async (value: boolean) => {
    setSavingOptIn(true);
    try {
      const res = await fetchApi('/couples/spicy-opt-in', { method: 'POST', body: JSON.stringify({ optIn: value }) });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.message || 'Could not update opt-in');
      }
      setSpice(await res.json());
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingOptIn(false);
    }
  };

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    rankCard: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
      backgroundColor: 'rgba(244,63,94,0.12)', borderRadius: RADIUS.md, padding: SPACING.md,
    },
    rankText: { color: '#F43F5E', fontWeight: '800', fontSize: 14 },
    xpText: { color: COLORS.textMuted, fontSize: 12, marginLeft: 'auto' },
    sectionLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: SPACING.sm },
    spiceCard: {
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.lg,
    },
    spiceRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
    spiceChip: {
      flex: 1, alignItems: 'center', gap: 4, paddingVertical: SPACING.sm,
      borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.glassBorder, backgroundColor: COLORS.surface,
    },
    spiceChipActive: { borderColor: '#F43F5E', backgroundColor: 'rgba(244,63,94,0.14)' },
    spiceChipText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 12 },
    spiceChipTextActive: { color: '#F43F5E' },
    optInRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.glassBorder,
    },
    optInText: { color: COLORS.text, fontSize: 13, fontWeight: '600', flex: 1, marginRight: SPACING.sm },
    optInSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
    lockNote: { color: COLORS.textMuted, fontSize: 12, marginTop: SPACING.sm, lineHeight: 17 },
    tile: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm,
    },
    tileIcon: {
      width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center',
    },
    tileTitle: { color: COLORS.text, fontWeight: '700', fontSize: 15 },
    tileDesc: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  }));

  if (loading && !summary) {
    return <SafeAreaView style={styles.root}><ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} /></SafeAreaView>;
  }

  if (!summary) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={TYPOGRAPHY.h2}>Couples</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={{ padding: SPACING.xl, alignItems: 'center' }}>
          <Text style={{ color: COLORS.textMuted, textAlign: 'center' }}>
            Link up with a partner from Edit Profile to unlock Couples activities.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const activities = [
    {
      key: 'challenges', title: 'Couples Challenges', desc: `${summary.relationship.rank} · ${summary.relationship.xp} XP`,
      icon: 'trophy' as const, gradient: '#F59E0B', onPress: () => navigation.navigate('CouplesChallenges'),
    },
    {
      key: 'tod', title: 'Truth or Dare', desc: 'Pick truth or dare, draw a prompt',
      icon: 'help-circle' as const, gradient: '#8B5CF6', onPress: () => navigation.navigate('TruthOrDare'),
    },
    {
      key: 'bottle', title: 'Spin the Bottle', desc: 'Spin to land on truth or dare',
      icon: 'sync' as const, gradient: '#22D3EE', onPress: () => navigation.navigate('SpinTheBottle'),
    },
    {
      key: 'cards', title: 'Couples Cards', desc: 'Draw conversation & connection cards',
      icon: 'albums' as const, gradient: '#F472B6', onPress: () => navigation.navigate('CouplesCards'),
    },
    {
      key: 'cardgame', title: 'Play a Card Game', desc: 'Five Cards or Cassino, just the two of you',
      icon: 'game-controller' as const, gradient: '#34D399',
      onPress: () => navigation.navigate('Main', { screen: 'Life', params: { screen: 'CardsHome' } }),
    },
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Couples</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.rankCard}>
        <Ionicons name="heart" size={20} color="#F43F5E" />
        <Text style={styles.rankText}>{summary.relationship.rank}</Text>
        <Text style={styles.xpText}>{summary.relationship.xp} XP · {summary.relationship.currentStreak}🔥 streak</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingTop: 0, paddingBottom: 60 }}>
        <Text style={styles.sectionLabel}>Spice Level</Text>
        <View style={styles.spiceCard}>
          <View style={styles.spiceRow}>
            {SPICE_LEVELS.map((lvl) => {
              const active = spice?.spiceLevel === lvl.key;
              return (
                <TouchableOpacity
                  key={lvl.key}
                  style={[styles.spiceChip, active && styles.spiceChipActive]}
                  onPress={() => chooseLevel(lvl.key)}
                  disabled={savingLevel}
                >
                  <Ionicons name={lvl.icon} size={16} color={active ? '#F43F5E' : COLORS.textMuted} />
                  <Text style={[styles.spiceChipText, active && styles.spiceChipTextActive]}>{lvl.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.optInRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.optInText}>I'm comfortable with Spicy content</Text>
              <Text style={styles.optInSub}>
                {spice?.partnerOptIn ? 'Your partner has opted in' : 'Waiting on your partner to opt in'}
              </Text>
            </View>
            <Switch
              value={!!spice?.myOptIn}
              onValueChange={toggleOptIn}
              disabled={savingOptIn}
              trackColor={{ false: COLORS.glassBorder, true: '#F43F5E' }}
              thumbColor="#fff"
            />
          </View>
          {!spice?.spicyUnlocked && (
            <Text style={styles.lockNote}>
              Spicy content unlocks once you both opt in and both have completed 18+ identity verification.
            </Text>
          )}
        </View>

        <Text style={styles.sectionLabel}>Activities</Text>
        {activities.map((a) => (
          <TouchableOpacity key={a.key} style={styles.tile} onPress={a.onPress} activeOpacity={0.8}>
            <View style={[styles.tileIcon, { backgroundColor: `${a.gradient}26` }]}>
              <Ionicons name={a.icon} size={20} color={a.gradient} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tileTitle}>{a.title}</Text>
              <Text style={styles.tileDesc}>{a.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
