import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';

export default function MyStokvelsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12, gap: 4 },
    back: { padding: 4, marginRight: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1 },
    iconBtn: { padding: 6 },
    card: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: COLORS.border,
    },
    cardIconWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#F59E0B15', justifyContent: 'center', alignItems: 'center' },
    cardTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14, marginBottom: 2 },
    cardSub: { color: COLORS.textMuted, fontSize: 12, marginBottom: 4 },
    cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardMetaText: { color: COLORS.textMuted, fontSize: 11 },
    rolePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: '#F59E0B22' },
    rolePillText: { color: '#F59E0B', fontSize: 10, fontWeight: '700' },
    empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
    emptyText: { color: COLORS.text, fontSize: 15, fontWeight: '600', textAlign: 'center', paddingHorizontal: SPACING.lg },
    emptyBtn: { backgroundColor: '#F59E0B', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
    emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    // bottom set dynamically via insets in JSX — see ExploreScreen.tsx's
    // fab style comment for why a static value here renders under the tab bar.
    fab: {
      position: 'absolute', right: SPACING.lg, bottom: SPACING.lg,
      width: 52, height: 52, borderRadius: 26,
      backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center',
      shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
    },
  }));
  const [stokvels, setStokvels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/finance/stokvels/mine');
      const data = await res.json();
      setStokvels(Array.isArray(data) ? data : []);
    } catch {
      setStokvels([]);
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Stokvels</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('CreateStokvel')}>
          <Ionicons name="add-circle-outline" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : stokvels.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="trending-up-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>You haven't joined a stokvel yet</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('CreateStokvel')}>
              <Text style={styles.emptyBtnText}>Create a stokvel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {stokvels.map(s => (
              <TouchableOpacity
                key={s.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('StokvelDetail', { stokvelId: s.id })}
              >
                <View style={styles.cardIconWrap}>
                  <Ionicons name="trending-up" size={20} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{s.name}</Text>
                  <Text style={styles.cardSub} numberOfLines={1}>{s.category}</Text>
                  <View style={styles.cardMetaRow}>
                    <Text style={styles.cardMetaText}>
                      {s._count?.members ?? 0} member{(s._count?.members ?? 0) === 1 ? '' : 's'}
                    </Text>
                    {s.myRole && (
                      <View style={styles.rolePill}><Text style={styles.rolePillText}>{s.myRole}</Text></View>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 76 }]} onPress={() => navigation.navigate('CreateStokvel')}>
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
