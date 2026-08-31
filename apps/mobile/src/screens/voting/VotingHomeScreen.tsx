import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import SessionHeaderActions from '../../components/SessionHeaderActions';

const STRUCTURE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  HOA: 'home',
  CORPORATE: 'briefcase',
  UNION: 'people',
  CLUB: 'ribbon',
  STUDENT_BODY: 'school',
  OTHER: 'business',
};

export default function VotingHomeScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, GRADIENTS } = theme;
  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12, gap: 4 },
    headerCenter: { flex: 1 },
    headerTitle: { ...TYPOGRAPHY.h2 },
    headerSub: { color: COLORS.textMuted, fontSize: 12 },
    hero: { marginHorizontal: SPACING.lg, borderRadius: 16, padding: 20, marginBottom: 16, overflow: 'hidden' },
    heroIcon: { position: 'absolute', right: 16, top: 12 },
    heroTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 4 },
    heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
    sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, marginBottom: 10 },
    sectionLabel: { ...TYPOGRAPHY.label, fontSize: 11 },
    createBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    createBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
    card: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: COLORS.border,
    },
    cardIconWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: `${COLORS.primary}22`, justifyContent: 'center', alignItems: 'center' },
    cardTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14, marginBottom: 2 },
    cardSub: { color: COLORS.textMuted, fontSize: 12, marginBottom: 4 },
    cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardMetaText: { color: COLORS.textMuted, fontSize: 11 },
    rolePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: `${COLORS.primary}22` },
    rolePillText: { color: COLORS.primary, fontSize: 10, fontWeight: '700' },
    electionPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: `${COLORS.success}22` },
    electionPillText: { color: COLORS.success, fontSize: 10, fontWeight: '700' },
    empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
    emptyText: { color: COLORS.text, fontSize: 15, fontWeight: '600', textAlign: 'center', paddingHorizontal: SPACING.lg },
  }));
  const [structures, setStructures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/voting/structures/mine', { headers: { 'Cache-Control': 'no-cache' } });
      const data = await res.json();
      setStructures(Array.isArray(data) ? data : []);
    } catch { setStructures([]); }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <SessionHeaderActions
          navigation={navigation}
          session={{
            id: 'voting',
            label: 'Ballot',
            icon: 'checkmark-done-circle',
            gradient: GRADIENTS.aurora,
            route: { name: 'Main', params: { screen: 'Life', params: { screen: 'VotingHome' } } },
          }}
        />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Ballot</Text>
          <Text style={styles.headerSub}>Elections for any structure, on XRPL</Text>
        </View>
      </View>

      <LinearGradient colors={GRADIENTS.aurora} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.hero}>
        <Ionicons name="shield-checkmark" size={40} color="rgba(255,255,255,0.3)" style={styles.heroIcon} />
        <Text style={styles.heroTitle}>Elections you can verify</Text>
        <Text style={styles.heroSub}>Every vote is biometric-gated and recorded as a real XRPL transaction — inclusion is provable, your selection stays secret.</Text>
      </LinearGradient>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionLabel}>YOUR STRUCTURES</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateStructure')}>
          <Ionicons name="add" size={14} color={COLORS.primary} />
          <Text style={styles.createBtnText}>Create structure</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : structures.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-circle-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>
              You're not on any voter roll yet — create a structure (HOA, company board, union, club) to run its first election.
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, gap: 10 }}>
            {structures.map((s: any) => {
              const openElections = (s.elections || []).filter((e: any) => e.status === 'OPEN').length;
              return (
                <TouchableOpacity key={s.id} style={styles.card} activeOpacity={0.85} onPress={() => navigation.navigate('StructureDetail', { structureId: s.id })}>
                  <View style={styles.cardIconWrap}>
                    <Ionicons name={STRUCTURE_ICONS[s.type] || 'business'} size={20} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{s.name}</Text>
                    <Text style={styles.cardSub} numberOfLines={1}>{s.type.replace('_', ' ')}</Text>
                    <View style={styles.cardMetaRow}>
                      <Text style={styles.cardMetaText}>{s._count?.members ?? 0} on roll</Text>
                      {s.myRole && (
                        <View style={styles.rolePill}><Text style={styles.rolePillText}>{s.myRole}</Text></View>
                      )}
                      {openElections > 0 && (
                        <View style={styles.electionPill}><Text style={styles.electionPillText}>{openElections} open</Text></View>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
