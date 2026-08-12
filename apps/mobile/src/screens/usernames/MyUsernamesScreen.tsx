import React, { useCallback, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../theme';
import { fetchApi } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCurrency } from '../../utils/format';

const LEVEL_COLOR: Record<string, string> = {
  Nano: '#6B7280', Micro: '#10B981', Midtier: '#3B82F6', Macro: '#A78BFA', 'Mega Influencer': '#F59E0B',
};

export default function MyUsernamesScreen({ navigation }: any) {
  const { refreshProfile } = useAuth();
  const [usernames, setUsernames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mintLabel, setMintLabel] = useState('');
  const [availability, setAvailability] = useState<{ available: boolean; reason?: string } | null>(null);
  const [minting, setMinting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(() => {
    fetchApi('/usernames/mine')
      .then(res => (res.ok ? res.json() : []))
      .then(data => Array.isArray(data) && setUsernames(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onChangeMintLabel = (text: string) => {
    setMintLabel(text);
    setAvailability(null);
    if (checkTimer.current) clearTimeout(checkTimer.current);
    const label = text.trim();
    if (label.length < 3) return;
    checkTimer.current = setTimeout(() => {
      fetchApi(`/usernames/check?label=${encodeURIComponent(label)}`)
        .then(res => (res.ok ? res.json() : null))
        .then(setAvailability)
        .catch(() => {});
    }, 400);
  };

  const mint = async () => {
    const label = mintLabel.trim();
    if (!label || !availability?.available) return;
    try {
      setMinting(true);
      const res = await fetchApi('/usernames/mint', { method: 'POST', body: JSON.stringify({ label }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Could not mint username');
      setMintLabel('');
      setAvailability(null);
      Alert.alert('Minted! 🎉', `@${label} is now yours (${formatCurrency(50)}).`);
      load();
    } catch (e: any) {
      Alert.alert('Mint failed', e.message);
    } finally {
      setMinting(false);
    }
  };

  const activate = async (id: string) => {
    try {
      setBusyId(id);
      const res = await fetchApi(`/usernames/${id}/activate`, { method: 'POST' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Could not activate');
      await refreshProfile();
      Alert.alert('Activated', `You're now using @${d.label}. Your displayed reputation now follows this username.`);
      load();
    } catch (e: any) {
      Alert.alert('Activation failed', e.message);
    } finally {
      setBusyId(null);
    }
  };

  const cancelListing = async (id: string) => {
    try {
      setBusyId(id);
      const res = await fetchApi(`/usernames/${id}/listing`, { method: 'DELETE' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Could not cancel');
      load();
    } catch (e: any) {
      Alert.alert('Cancel failed', e.message);
    } finally {
      setBusyId(null);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isBusy = busyId === item.id;
    const listed = item.saleStatus !== 'NONE';
    return (
      <View style={styles.cardWrapper}>
        <LinearGradient
          colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.02)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>@{item.label}</Text>
            {item.isActive && (
              <View style={styles.activeBadge}>
                <Ionicons name="checkmark-circle" size={11} color="#10B981" />
                <Text style={styles.activeBadgeText}>ACTIVE</Text>
              </View>
            )}
          </View>
          <View style={styles.cardFooter}>
            <View style={[styles.levelPill, { borderColor: (LEVEL_COLOR[item.level] || '#6B7280') + '88', backgroundColor: (LEVEL_COLOR[item.level] || '#6B7280') + '22' }]}>
              <Ionicons name="star" size={10} color={LEVEL_COLOR[item.level] || '#6B7280'} />
              <Text style={[styles.levelText, { color: LEVEL_COLOR[item.level] || '#6B7280' }]}>{item.level}</Text>
            </View>
            <Text style={styles.cardMeta}>rep {Math.round(item.reputationScore)}</Text>
          </View>
          {listed && (
            <Text style={styles.listedNote}>
              {item.saleStatus === 'AUCTION' ? 'Up for auction' : 'Listed for sale'} — {formatCurrency(item.currentBid ?? item.price)}
            </Text>
          )}
          <View style={styles.actionsRow}>
            {!item.isActive && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => activate(item.id)} disabled={isBusy}>
                {isBusy ? <ActivityIndicator color="#A78BFA" size="small" /> : <Text style={styles.actionText}>Activate</Text>}
              </TouchableOpacity>
            )}
            {!listed ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnPrimary]}
                onPress={() => navigation.navigate('UsernameForm', { usernameId: item.id, label: item.label })}
                disabled={isBusy}
              >
                <Text style={styles.actionTextPrimary}>List for sale</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => cancelListing(item.id)} disabled={isBusy}>
                {isBusy ? <ActivityIndicator color="#F87171" size="small" /> : <Text style={styles.actionTextDanger}>Cancel listing</Text>}
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>My Usernames</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.mintCard}>
        <Text style={styles.mintLabel}>MINT A NEW USERNAME ({formatCurrency(50)})</Text>
        <View style={styles.mintRow}>
          <TextInput
            style={styles.mintInput}
            placeholder="new_handle"
            placeholderTextColor={COLORS.textMuted}
            value={mintLabel}
            onChangeText={onChangeMintLabel}
            autoCapitalize="none"
          />
          <TouchableOpacity style={[styles.mintBtn, (!availability?.available || minting) && { opacity: 0.4 }]} onPress={mint} disabled={!availability?.available || minting}>
            {minting ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.mintBtnText}>Mint</Text>}
          </TouchableOpacity>
        </View>
        {mintLabel.trim().length >= 3 && availability && (
          <Text style={[styles.availabilityText, { color: availability.available ? '#10B981' : '#F87171' }]}>
            {availability.available ? 'Available!' : availability.reason}
          </Text>
        )}
      </View>

      <FlatList
        data={usernames}
        keyExtractor={u => u.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: SPACING.lg, gap: 12, paddingBottom: 60 }}
        ListEmptyComponent={<Text style={styles.empty}>{loading ? 'Loading…' : 'No usernames yet.'}</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#150A2E' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: RADIUS.pill,
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    justifyContent: 'center', alignItems: 'center',
  },
  mintCard: {
    marginHorizontal: SPACING.lg, marginBottom: SPACING.sm,
    backgroundColor: 'rgba(167,139,250,0.08)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.4)',
    borderRadius: RADIUS.lg, padding: 14,
  },
  mintLabel: { ...TYPOGRAPHY.label, fontSize: 10.5, marginBottom: 8 },
  mintRow: { flexDirection: 'row', gap: 10 },
  mintInput: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: RADIUS.pill,
    borderWidth: 1, borderColor: COLORS.glassBorder, color: COLORS.text,
    paddingHorizontal: 14, paddingVertical: 9, fontSize: 13,
  },
  mintBtn: { backgroundColor: '#7C3AED', borderRadius: RADIUS.pill, paddingHorizontal: 20, justifyContent: 'center' },
  mintBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  availabilityText: { fontSize: 11.5, fontWeight: '700', marginTop: 8 },
  cardWrapper: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.2)',
  },
  card: {
    padding: 16,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLabel: { 
    color: '#FFF', 
    fontWeight: '900', 
    fontSize: 18, 
    flex: 1,
    letterSpacing: 0.5,
  },
  activeBadge: {
    flexDirection: 'row', gap: 4, alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.15)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.4)',
    borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 4,
  },
  activeBadgeText: { color: '#10B981', fontSize: 9.5, fontWeight: '900' },
  cardFooter: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 12 },
  levelPill: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1, 
    borderRadius: RADIUS.pill, 
    paddingHorizontal: 8, 
    paddingVertical: 4 
  },
  levelText: { fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase' },
  cardMeta: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600' },
  listedNote: { color: '#F59E0B', fontSize: 11.5, marginTop: 8, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  actionText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 12.5 },
  actionBtnPrimary: { backgroundColor: 'rgba(167,139,250,0.15)', borderColor: 'rgba(167,139,250,0.4)' },
  actionTextPrimary: { color: '#A78BFA', fontWeight: '700', fontSize: 12.5 },
  actionBtnDanger: { backgroundColor: 'rgba(248,113,113,0.1)', borderColor: 'rgba(248,113,113,0.4)' },
  actionTextDanger: { color: '#F87171', fontWeight: '700', fontSize: 12.5 },
  empty: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', marginTop: 40 },
});
