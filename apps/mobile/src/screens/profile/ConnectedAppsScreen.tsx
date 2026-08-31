import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import ErrorState from '../../components/ErrorState';

interface Integration {
  provider: 'google_calendar' | 'github' | 'slack';
  label: string;
  configured: boolean;
  connected: boolean;
  accountLabel: string | null;
  connectedAt: string | null;
}

const PROVIDER_ICON: Record<Integration['provider'], string> = {
  google_calendar: 'calendar-outline',
  github: 'logo-github',
  slack: 'logo-slack',
};

// External services Nova can reach OUT to on the user's behalf (distinct
// from apps/mobile/src/screens/ai/McpApprovalsScreen, which is about
// EXTERNAL tools reaching IN to Guranda). Connecting opens the system
// browser for the real provider OAuth consent screen — this app never
// collects the user's Google/GitHub/Slack password itself, and never sees
// the token (apps/api/src/integrations/integrations.service.ts stores it
// encrypted, server-side only).
export default function ConnectedAppsScreen({ navigation, route }: any) {
  const [items, setItems] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
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
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      padding: 14,
    },
    icon: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: COLORS.surfaceElevated,
      justifyContent: 'center', alignItems: 'center',
    },
    label: { color: COLORS.text, fontWeight: '700', fontSize: 14.5 },
    sub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
    connectBtn: {
      backgroundColor: COLORS.primary, borderRadius: RADIUS.pill,
      paddingVertical: 9, paddingHorizontal: 16,
    },
    connectText: { color: '#FFF', fontWeight: '700', fontSize: 12.5 },
    disconnectBtn: {
      backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border,
      borderRadius: RADIUS.pill, paddingVertical: 9, paddingHorizontal: 16,
    },
    disconnectText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 12.5 },
    notReadyText: { color: COLORS.textMuted, fontSize: 11.5, fontStyle: 'italic' },
  }));

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await fetchApi('/integrations');
      if (!res.ok) throw new Error('Failed to load');
      setItems(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Landed back here from integrationsDeepLink.ts after the OAuth round-trip.
  useEffect(() => {
    const { status, message, provider } = route?.params || {};
    if (!status) return;
    if (status === 'success') {
      load();
    } else if (status === 'error') {
      Alert.alert('Connection failed', message || `Couldn't connect ${provider}.`);
    }
    navigation.setParams({ status: undefined, message: undefined, provider: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params?.status]);

  const connect = async (provider: string) => {
    setConnectingProvider(provider);
    try {
      const res = await fetchApi(`/integrations/${provider}/start`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to start connection');
      await Linking.openURL(data.authorizeUrl);
    } catch (e: any) {
      Alert.alert("Can't connect right now", e.message || 'Please try again.');
    } finally {
      setConnectingProvider(null);
    }
  };

  const disconnect = (provider: string, label: string) => {
    Alert.alert(`Disconnect ${label}?`, 'Nova will no longer be able to use it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetchApi(`/integrations/${provider}`, { method: 'DELETE' });
            load();
          } catch {
            Alert.alert('Failed to disconnect', 'Please try again.');
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
        <Text style={TYPOGRAPHY.h2}>External Apps</Text>
        <View style={{ width: 40 }} />
      </View>
      <Text style={styles.intro}>
        Let Nova read and act on your accounts elsewhere — Guranda never sees your password, only what you approve.
      </Text>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 30 }} />
      ) : error ? (
        <ErrorState title="Couldn't load connected apps" onRetry={load} />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {items.map((item) => (
            <View key={item.provider} style={styles.row}>
              <View style={styles.icon}>
                <Ionicons name={PROVIDER_ICON[item.provider] as any} size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{item.label}</Text>
                {item.connected ? (
                  <Text style={styles.sub}>{item.accountLabel || 'Connected'}</Text>
                ) : !item.configured ? (
                  <Text style={styles.notReadyText}>Not set up yet</Text>
                ) : (
                  <Text style={styles.sub}>Not connected</Text>
                )}
              </View>
              {item.connected ? (
                <TouchableOpacity style={styles.disconnectBtn} onPress={() => disconnect(item.provider, item.label)}>
                  <Text style={styles.disconnectText}>Disconnect</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.connectBtn, !item.configured && { opacity: 0.4 }]}
                  disabled={!item.configured || connectingProvider === item.provider}
                  onPress={() => connect(item.provider)}
                >
                  {connectingProvider === item.provider ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.connectText}>Connect</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
