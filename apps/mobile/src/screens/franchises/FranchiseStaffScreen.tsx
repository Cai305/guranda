import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';

const ROLES: { id: 'MANAGER' | 'STAFF'; label: string }[] = [
  { id: 'MANAGER', label: 'Manager' },
  { id: 'STAFF', label: 'Staff' },
];

// Real staff management for one franchise location (Phase 7) — add/remove
// staff by username, showing their role. Every mutation goes through the
// real /franchises endpoints, which enforce the real "owner, parent business
// owner, or existing manager of THIS location" permission server-side — a
// STAFF-role viewer who isn't authorized simply gets a real 403 from the API,
// surfaced as an Alert here rather than silently hidden.
export default function FranchiseStaffScreen({ navigation, route }: any) {
  const { franchiseUsernameId, franchiseLabel } = route.params;
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY, SPACING } = theme;
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [handle, setHandle] = useState('');
  const [role, setRole] = useState<'MANAGER' | 'STAFF'>('STAFF');
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchApi(`/franchises/${franchiseUsernameId}/staff`)
      .then(async (res) => {
        if (res.status === 403) { setForbidden(true); return []; }
        setForbidden(false);
        return res.ok ? res.json() : [];
      })
      .then((d) => Array.isArray(d) && setStaff(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [franchiseUsernameId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING, TYPOGRAPHY }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    subtitle: { color: COLORS.textMuted, fontSize: 12.5, paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
    addCard: {
      marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, padding: 14,
      backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg,
    },
    addLabel: { ...TYPOGRAPHY.label, fontSize: 10.5, marginBottom: 8 },
    addRow: { flexDirection: 'row', gap: 8 },
    addInput: {
      flex: 1, backgroundColor: COLORS.background, borderRadius: RADIUS.pill, borderWidth: 1,
      borderColor: COLORS.border, color: COLORS.text, paddingHorizontal: 14, paddingVertical: 9, fontSize: 13,
    },
    roleRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    roleChip: {
      paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.pill,
      borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background,
    },
    roleChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    roleChipText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 12 },
    roleChipTextActive: { color: '#fff' },
    addBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, paddingHorizontal: 18, justifyContent: 'center' },
    addBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
    staffCard: {
      marginHorizontal: SPACING.lg, marginBottom: 8, padding: 12, backgroundColor: COLORS.surface,
      borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    staffName: { color: COLORS.text, fontWeight: '700', fontSize: 14.5 },
    roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.pill, marginTop: 4, alignSelf: 'flex-start' },
    roleBadgeText: { fontSize: 10, fontWeight: '800' },
    removeBtn: { padding: 6 },
    empty: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', marginTop: 40, paddingHorizontal: 40 },
  }));

  const addStaff = async () => {
    const clean = handle.trim().replace(/^@/, '');
    if (!clean) return;
    setAdding(true);
    try {
      const resolveRes = await fetchApi(`/franchises/resolve-user?username=${encodeURIComponent(clean)}`);
      const resolveData = await resolveRes.json();
      if (!resolveRes.ok) throw new Error(resolveData.message || `No user @${clean} found`);

      const res = await fetchApi(`/franchises/${franchiseUsernameId}/staff`, {
        method: 'POST',
        body: JSON.stringify({ targetUserId: resolveData.userId, role }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Could not add staff');
      setHandle('');
      load();
    } catch (e: any) {
      Alert.alert('Could not add staff', e.message);
    } finally {
      setAdding(false);
    }
  };

  const removeStaff = async (staffId: string, name: string) => {
    Alert.alert('Remove staff', `Revoke @${name}'s access to @${franchiseLabel}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          setBusyId(staffId);
          try {
            const res = await fetchApi(`/franchises/staff/${staffId}`, { method: 'DELETE' });
            const d = await res.json();
            if (!res.ok) throw new Error(d.message || 'Could not revoke access');
            load();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Staff</Text>
        <View style={{ width: 36 }} />
      </View>
      <Text style={styles.subtitle}>@{franchiseLabel}</Text>

      {forbidden ? (
        <View style={{ padding: SPACING.lg }}>
          <Text style={styles.empty}>
            You're not authorized to manage this location's staff — only the business owner or an existing manager of @{franchiseLabel} can.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.addCard}>
            <Text style={styles.addLabel}>ADD STAFF BY USERNAME</Text>
            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                placeholder="@handle"
                placeholderTextColor={COLORS.textMuted}
                value={handle}
                onChangeText={setHandle}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.addBtn} onPress={addStaff} disabled={adding || !handle.trim()}>
                {adding ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.addBtnText}>Add</Text>}
              </TouchableOpacity>
            </View>
            <View style={styles.roleRow}>
              {ROLES.map((r) => (
                <TouchableOpacity key={r.id} style={[styles.roleChip, role === r.id && styles.roleChipActive]} onPress={() => setRole(r.id)}>
                  <Text style={[styles.roleChipText, role === r.id && styles.roleChipTextActive]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 30 }} />
          ) : (
            <FlatList
              data={staff}
              keyExtractor={(s) => s.id}
              contentContainerStyle={{ paddingTop: 4, paddingBottom: 40 }}
              ListEmptyComponent={<Text style={styles.empty}>No staff yet — add one above.</Text>}
              renderItem={({ item }) => {
                const isManager = item.role === 'MANAGER';
                const displayName = item.user?.profile?.displayName || item.user?.username || 'Unknown';
                return (
                  <View style={styles.staffCard}>
                    <View>
                      <Text style={styles.staffName}>@{item.user?.username || 'unknown'}{item.user?.profile?.displayName ? ` (${displayName})` : ''}</Text>
                      <View style={[styles.roleBadge, { backgroundColor: isManager ? 'rgba(167,139,250,0.15)' : 'rgba(107,114,128,0.15)' }]}>
                        <Text style={[styles.roleBadgeText, { color: isManager ? '#A78BFA' : '#9CA3AF' }]}>{item.role}</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.removeBtn} onPress={() => removeStaff(item.id, item.user?.username || 'this user')} disabled={busyId === item.id}>
                      {busyId === item.id ? <ActivityIndicator size="small" color="#F87171" /> : <Ionicons name="person-remove-outline" size={20} color="#F87171" />}
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}
