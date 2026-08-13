import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { CampaignDto } from '@mxit2/types';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#F59E0B',
  ACTIVE: '#10B981',
  REJECTED: '#EF4444',
  ENDED: '#6B7280',
};

export default function MyCampaignsScreen({ navigation }: any) {
  const [campaigns, setCampaigns] = useState<CampaignDto[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY, SPACING } = theme;

  const load = useCallback(() => {
    setLoading(true);
    fetchApi('/campaigns/mine')
      .then(r => (r.ok ? r.json() : []))
      .then(d => Array.isArray(d) && setCampaigns(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING, TYPOGRAPHY }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    fab: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    card: {
      marginHorizontal: SPACING.lg, marginBottom: SPACING.md, padding: SPACING.md,
      backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    title: { ...TYPOGRAPHY.body1, fontWeight: '700', flex: 1, marginRight: SPACING.sm },
    statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.pill },
    statusText: { color: '#fff', fontSize: 10, fontWeight: '800' },
    metaText: { color: COLORS.textMuted, fontSize: 12, marginTop: 6 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 100 },
    emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
    createBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
    createBtnText: { color: '#fff', fontWeight: '700' },
  }));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>My Campaigns</Text>
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateCampaign')}>
          <Ionicons name="add" size={26} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.empty}><ActivityIndicator color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={campaigns}
          keyExtractor={c => c.id}
          contentContainerStyle={{ paddingTop: SPACING.sm, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="megaphone-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No campaigns yet — create one to appear in the Opportunities carousel.</Text>
              <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateCampaign')}>
                <Text style={styles.createBtnText}>Create Campaign</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => navigation.navigate('CampaignAnalytics', { campaignId: item.id })}>
              <View style={styles.row}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <View style={[styles.statusPill, { backgroundColor: STATUS_COLOR[item.status] ?? '#6B7280' }]}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.metaText}>{item.rewardLabel} · {item.impressions} impressions · {item.clicks} clicks</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
