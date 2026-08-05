import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';

const ACTION_ICON: Record<string, string> = {
  CREATED: 'flag', MEMBER_JOINED: 'person-add', MEMBER_PROMOTED: 'ribbon',
  MULTISIG_ACTIVATED: 'key', CONTRIBUTION: 'arrow-up-circle', REQUEST_SUBMITTED: 'document-text',
  VOTE_CAST: 'checkmark-circle-outline', REQUEST_APPROVED: 'checkmark-done-circle',
  REQUEST_REJECTED: 'close-circle', REQUEST_SIGNED: 'create', FUNDS_RELEASED: 'cash',
};

export default function StokvelAuditLogScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    row: { flexDirection: 'row', gap: 10, backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border },
    iconWrap: { width: 32, height: 32, borderRadius: 9, backgroundColor: '#F59E0B15', justifyContent: 'center', alignItems: 'center' },
    action: { color: COLORS.text, fontWeight: '700', fontSize: 12, textTransform: 'capitalize' },
    detail: { color: COLORS.textMuted, fontSize: 12, marginTop: 3 },
    time: { color: COLORS.textMuted, fontSize: 10, marginTop: 4 },
    empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyText: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  }));
  const { stokvelId } = route.params;
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi(`/finance/stokvels/${stokvelId}/audit-log`);
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch { setLogs([]); }
    setLoading(false);
  }, [stokvelId]);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Audit Log</Text>
        <View style={{ width: 30 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: SPACING.lg, gap: 10, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.primary} />}
        >
          {logs.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Nothing logged yet</Text>
            </View>
          ) : (
            logs.map(log => (
              <View key={log.id} style={styles.row}>
                <View style={styles.iconWrap}>
                  <Ionicons name={(ACTION_ICON[log.action] || 'ellipse') as any} size={16} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.action}>{log.action.replace(/_/g, ' ')}</Text>
                  {log.detail && <Text style={styles.detail}>{log.detail}</Text>}
                  <Text style={styles.time}>{new Date(log.createdAt).toLocaleString()}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
