import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';

interface PendingMcpAction {
  id: string;
  toolName: string;
  summary: string;
  createdAt: string;
}

// External AI tools (Claude Desktop, Claude Code, etc, connected over MCP —
// see apps/api/src/mcp/mcp.controller.ts) can't move money or write data on
// their own: a sensitive tool call from outside the app is parked as a
// PendingMcpAction and shows up here (and as a push notification) for the
// user to approve or decline in person — the same real gate the in-chat
// approval card enforces for Nova's own tool calls.
export default function McpApprovalsScreen({ navigation, route }: any) {
  const [items, setItems] = useState<PendingMcpAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: RADIUS.pill,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      justifyContent: 'center', alignItems: 'center',
    },
    intro: { color: COLORS.textMuted, fontSize: 12.5, lineHeight: 18, paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
    list: { paddingHorizontal: SPACING.lg, gap: 10, paddingBottom: 40 },
    card: {
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      padding: 14,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    cardTitle: { color: '#F59E0B', fontWeight: '700', fontSize: 12.5 },
    cardSummary: { color: COLORS.text, fontSize: 14.5, fontWeight: '600', lineHeight: 20 },
    cardTool: { color: COLORS.textMuted, fontSize: 11.5, marginTop: 4 },
    buttons: { flexDirection: 'row', gap: 10, marginTop: 14 },
    btn: { flex: 1, borderRadius: RADIUS.pill, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
    declineBtn: { backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border },
    declineText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 13.5 },
    approveBtn: { backgroundColor: COLORS.primary },
    approveText: { color: '#FFF', fontWeight: '700', fontSize: 13.5 },
  }));

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await fetchApi('/mcp/pending');
      if (!res.ok) throw new Error('Failed to load');
      setItems(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Deep-linked from a push notification (data: { pendingActionId }) — no
  // dedicated single-item view exists, so just make sure the list is fresh;
  // the relevant card will be at/near the top since these are newest-first.
  useEffect(() => {
    if (route?.params?.pendingActionId) load();
  }, [route?.params?.pendingActionId, load]);

  const resolve = async (id: string, approved: boolean) => {
    setResolvingId(id);
    try {
      const res = await fetchApi(`/mcp/pending/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ approved }),
      });
      if (!res.ok) throw new Error('Failed to resolve');
      setItems(prev => prev.filter(i => i.id !== id));
    } catch {
      // Leave the card in place — load() on next pull-to-refresh will show
      // its real current status if the request actually landed server-side.
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>External approvals</Text>
        <View style={{ width: 40 }} />
      </View>
      <Text style={styles.intro}>
        Requests from AI tools you've connected outside Guranda (Claude Desktop, Claude Code, etc.) that need your
        say-so before they run — nothing here has happened yet.
      </Text>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 30 }} />
      ) : error ? (
        <ErrorState title="Couldn't load pending approvals" onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState icon="shield-checkmark-outline" title="Nothing pending" subtitle="Approved and declined requests won't show up here." />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
        >
          {items.map(item => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="shield-checkmark" size={16} color="#F59E0B" />
                <Text style={styles.cardTitle}>APPROVAL NEEDED</Text>
              </View>
              <Text style={styles.cardSummary}>{item.summary}</Text>
              <Text style={styles.cardTool}>{item.toolName}</Text>
              <View style={styles.buttons}>
                <TouchableOpacity
                  style={[styles.btn, styles.declineBtn]}
                  disabled={resolvingId === item.id}
                  onPress={() => resolve(item.id, false)}
                >
                  <Text style={styles.declineText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.approveBtn]}
                  disabled={resolvingId === item.id}
                  onPress={() => resolve(item.id, true)}
                >
                  {resolvingId === item.id ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.approveText}>Approve</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
