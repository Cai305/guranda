import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function RelationshipRequestsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY, SPACING } = theme;
  const { refreshProfile } = useAuth();
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchApi('/relationships/pending')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setPending(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const respond = async (id: string, action: 'accept' | 'decline') => {
    await fetchApi(`/relationships/${id}/${action}`, { method: 'POST' });
    if (action === 'accept') await refreshProfile();
    load();
  };

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md, padding: SPACING.md, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm,
    },
    avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surface },
    name: { color: COLORS.text, fontWeight: '700' },
    sub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
    acceptBtn: { backgroundColor: COLORS.success, borderRadius: RADIUS.pill, padding: 8 },
    declineBtn: { backgroundColor: COLORS.error, borderRadius: RADIUS.pill, padding: 8 },
  }));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Relationship Requests</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : pending.length === 0 ? (
        <View style={{ alignItems: 'center', padding: SPACING.xl }}>
          <Ionicons name="heart-outline" size={40} color={COLORS.textMuted} />
          <Text style={{ color: COLORS.textMuted, marginTop: 10 }}>No pending requests.</Text>
        </View>
      ) : (
        pending.map((p) => (
          <View key={p.id} style={styles.row}>
            {p.requester?.avatarUrl ? (
              <Image source={{ uri: p.requester.avatarUrl }} style={styles.avatar} />
            ) : (
              <Ionicons name="person-circle" size={32} color={COLORS.primary} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{p.requester?.displayName || p.requester?.username}</Text>
              <Text style={styles.sub}>wants to link up as {p.intendedStatus === 'MARRIED' ? 'married' : 'in a relationship'}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.acceptBtn} onPress={() => respond(p.id, 'accept')}>
                <Ionicons name="checkmark" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.declineBtn} onPress={() => respond(p.id, 'decline')}>
                <Ionicons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </SafeAreaView>
  );
}
