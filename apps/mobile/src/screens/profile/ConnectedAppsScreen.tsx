import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import ErrorState from '../../components/ErrorState';

type Provider = 'google_calendar' | 'github' | 'slack' | 'youtube' | 'tiktok' | 'x' | 'linkedin' | 'facebook' | 'telegram' | 'whatsapp';

interface Integration {
  provider: Provider;
  label: string;
  configured: boolean;
  connected: boolean;
  accountLabel: string | null;
  connectedAt: string | null;
  // Telegram-only (Phase 8) — see apps/api's IntegrationsService.
  telegramDefaultChatId?: number | null;
}

interface TelegramIdentity {
  botId: number;
  username: string;
  firstName: string;
}

interface TelegramUpdate {
  updateId: number;
  chatId: number;
  chatType: string;
  fromUsername: string | null;
  fromFirstName: string | null;
  text: string | null;
  date: number;
}

const PROVIDER_ICON: Record<Provider, string> = {
  google_calendar: 'calendar-outline',
  github: 'logo-github',
  slack: 'logo-slack',
  youtube: 'logo-youtube',
  tiktok: 'logo-tiktok',
  x: 'logo-x',
  linkedin: 'logo-linkedin',
  facebook: 'logo-facebook',
  telegram: 'paper-plane-outline',
  whatsapp: 'logo-whatsapp',
};

// Phase 5 connector scaffolding: real adapter code exists for these 5
// (apps/api/src/integrations/oauth-providers.ts + adapters/), but Guranda
// has no real developer app registered with any platform yet — `configured`
// below is computed live from real env vars server-side (see
// integrations.service.ts's listForUser), never faked here. Telegram is the
// one exception that can actually work today: it needs no app-level
// credential, just the user's own bot token from @BotFather.

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
  const [telegramTokenInput, setTelegramTokenInput] = useState('');
  const [telegramConnecting, setTelegramConnecting] = useState(false);
  const [whatsappTokenInput, setWhatsappTokenInput] = useState('');
  const [whatsappPhoneIdInput, setWhatsappPhoneIdInput] = useState('');
  const [whatsappConnecting, setWhatsappConnecting] = useState(false);
  const [telegramIdentity, setTelegramIdentity] = useState<TelegramIdentity | null>(null);
  const [telegramVerifying, setTelegramVerifying] = useState(false);
  const [telegramActivityOpen, setTelegramActivityOpen] = useState(false);
  const [telegramUpdates, setTelegramUpdates] = useState<TelegramUpdate[] | null>(null);
  const [telegramUpdatesLoading, setTelegramUpdatesLoading] = useState(false);
  const [telegramUpdatesError, setTelegramUpdatesError] = useState(false);
  // Phase 8 "publish everywhere": which real chat_id (if any) is currently
  // set as the fan-out target, plus which row is mid-request while the
  // user is setting a new one.
  const [settingDefaultChatId, setSettingDefaultChatId] = useState<number | null>(null);
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
    telegramRow: {
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      padding: 14, gap: 10,
    },
    telegramTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    telegramHint: { color: COLORS.textMuted, fontSize: 11.5, lineHeight: 16 },
    telegramInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    telegramInput: {
      flex: 1,
      backgroundColor: COLORS.surfaceElevated,
      borderWidth: 1, borderColor: COLORS.border,
      borderRadius: RADIUS.md,
      paddingHorizontal: 12, paddingVertical: 9,
      color: COLORS.text, fontSize: 13,
    },
    telegramActionsRow: { flexDirection: 'row', gap: 8 },
    telegramSmallBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border,
      borderRadius: RADIUS.pill, paddingVertical: 7, paddingHorizontal: 12,
    },
    telegramSmallBtnText: { color: COLORS.text, fontWeight: '600', fontSize: 12 },
    telegramIdentityBox: {
      backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.md,
      padding: 10, gap: 2,
    },
    telegramIdentityText: { color: COLORS.text, fontSize: 12.5, fontWeight: '600' },
    telegramIdentitySub: { color: COLORS.textMuted, fontSize: 11 },
    telegramUpdateRow: {
      backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.md,
      padding: 10, gap: 2,
    },
    telegramUpdateFrom: { color: COLORS.text, fontSize: 12.5, fontWeight: '700' },
    telegramUpdateText: { color: COLORS.textMuted, fontSize: 12, marginTop: 1 },
    telegramUpdateMeta: { color: COLORS.textMuted, fontSize: 10.5, marginTop: 3 },
    telegramEmptyText: { color: COLORS.textMuted, fontSize: 11.5, fontStyle: 'italic', padding: 4 },
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

  // Telegram isn't OAuth2 (see apps/api/src/integrations/adapters/telegram.
  // adapter.ts) — the user pastes a bot token from @BotFather directly.
  // The API calls Telegram's real getMe endpoint before saving anything, so
  // a bad/fake token comes back here as a real error, never a fake success.
  const connectTelegram = async () => {
    const token = telegramTokenInput.trim();
    if (!token) return;
    setTelegramConnecting(true);
    try {
      const res = await fetchApi('/integrations/telegram/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Telegram rejected this bot token.');
      setTelegramTokenInput('');
      Alert.alert('Connected', `Connected as @${data.username}.`);
      load();
    } catch (e: any) {
      Alert.alert("Couldn't connect Telegram", e.message || 'Please try again.');
    } finally {
      setTelegramConnecting(false);
    }
  };

  // WhatsApp isn't OAuth2 either (see apps/api/src/integrations/adapters/
  // whatsapp.adapter.ts) — the user pastes a system-user access token AND a
  // phone_number_id, both obtained directly from Meta Business Manager
  // (business.facebook.com). The API calls the Cloud API's real
  // phone-number-metadata endpoint before saving anything, so a bad/fake
  // pair comes back here as a real error, never a fake success.
  const connectWhatsApp = async () => {
    const accessToken = whatsappTokenInput.trim();
    const phoneNumberId = whatsappPhoneIdInput.trim();
    if (!accessToken || !phoneNumberId) return;
    setWhatsappConnecting(true);
    try {
      const res = await fetchApi('/integrations/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, phoneNumberId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Meta rejected these WhatsApp credentials.');
      setWhatsappTokenInput('');
      setWhatsappPhoneIdInput('');
      Alert.alert('Connected', `Connected ${data.displayPhoneNumber}.`);
      load();
    } catch (e: any) {
      Alert.alert("Couldn't connect WhatsApp", e.message || 'Please try again.');
    } finally {
      setWhatsappConnecting(false);
    }
  };

  // Live "Verify" — a real getMe call through the connected bot token, not
  // just re-displaying the @username label saved at connect time.
  const verifyTelegram = async () => {
    setTelegramVerifying(true);
    try {
      const res = await fetchApi('/integrations/telegram/me');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Verification failed');
      setTelegramIdentity(data);
    } catch (e: any) {
      Alert.alert("Couldn't verify bot", e.message || 'Please try again.');
    } finally {
      setTelegramVerifying(false);
    }
  };

  // On-demand recent-activity refresh — same real getUpdates data the
  // background poll (apps/api/src/integrations/telegram-poll.service.ts)
  // turns into Notification rows every ~2 minutes, fetched here immediately
  // for a responsive "what's come in" view. A bot only sees chats that have
  // already messaged it or added it — not a full personal Telegram history.
  const loadTelegramActivity = async () => {
    setTelegramUpdatesLoading(true);
    setTelegramUpdatesError(false);
    try {
      const res = await fetchApi('/integrations/telegram/updates');
      if (!res.ok) throw new Error('Failed to load');
      setTelegramUpdates(await res.json());
    } catch {
      setTelegramUpdatesError(true);
    } finally {
      setTelegramUpdatesLoading(false);
    }
  };

  const toggleTelegramActivity = () => {
    const next = !telegramActivityOpen;
    setTelegramActivityOpen(next);
    if (next && telegramUpdates === null) loadTelegramActivity();
  };

  // Phase 8: the user picks ONE real chat_id from their own real
  // getUpdates() results above to become the "publish everywhere" fan-out
  // target — a bot can't message a chat that's never messaged it, so this
  // can't be inferred, only chosen from real inbound activity (see
  // apps/api's IntegrationsService.setTelegramDefaultChatId).
  const setDefaultChat = async (chatId: number) => {
    setSettingDefaultChatId(chatId);
    try {
      const res = await fetchApi('/integrations/telegram/default-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to set default chat.');
      Alert.alert('Default chat set', 'The composer’s "Also post to Telegram" toggle will send here.');
      load();
    } catch (e: any) {
      Alert.alert("Couldn't set default chat", e.message || 'Please try again.');
    } finally {
      setSettingDefaultChatId(null);
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
          {items.map((item) => {
            // Telegram gets its own row shape: no system-browser redirect,
            // just a bot-token paste-in that calls the real connect
            // endpoint (see connectTelegram above) — an honest "type your
            // token" flow, not a disabled button implying a redirect that
            // doesn't exist for this provider.
            if (item.provider === 'telegram') {
              return (
                <View key="telegram" style={styles.telegramRow}>
                  <View style={styles.telegramTop}>
                    <View style={styles.icon}>
                      <Ionicons name={PROVIDER_ICON.telegram as any} size={20} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>{item.label}</Text>
                      {item.connected ? (
                        <Text style={styles.sub}>{item.accountLabel || 'Connected'}</Text>
                      ) : !item.configured ? (
                        <Text style={styles.notReadyText}>Not available in this environment yet</Text>
                      ) : (
                        <Text style={styles.sub}>Not connected</Text>
                      )}
                    </View>
                    {item.connected && (
                      <TouchableOpacity style={styles.disconnectBtn} onPress={() => disconnect('telegram', 'Telegram')}>
                        <Text style={styles.disconnectText}>Disconnect</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {item.connected && (
                    <>
                      <View style={styles.telegramActionsRow}>
                        <TouchableOpacity style={styles.telegramSmallBtn} onPress={verifyTelegram} disabled={telegramVerifying}>
                          {telegramVerifying ? (
                            <ActivityIndicator color={COLORS.text} size="small" />
                          ) : (
                            <Ionicons name="checkmark-circle-outline" size={14} color={COLORS.text} />
                          )}
                          <Text style={styles.telegramSmallBtnText}>Verify bot</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.telegramSmallBtn} onPress={toggleTelegramActivity}>
                          <Ionicons name={telegramActivityOpen ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.text} />
                          <Text style={styles.telegramSmallBtnText}>Recent activity</Text>
                        </TouchableOpacity>
                      </View>

                      {telegramIdentity && (
                        <View style={styles.telegramIdentityBox}>
                          <Text style={styles.telegramIdentityText}>
                            Verified live: @{telegramIdentity.username} ({telegramIdentity.firstName})
                          </Text>
                          <Text style={styles.telegramIdentitySub}>Bot ID {telegramIdentity.botId}</Text>
                        </View>
                      )}

                      {/* Phase 8: honest status of the "publish everywhere"
                          fan-out target — a real chat_id once picked below,
                          or a plain explanation of why there isn't one yet. */}
                      <View style={styles.telegramIdentityBox}>
                        <Text style={styles.telegramIdentityText}>
                          {item.telegramDefaultChatId
                            ? `Publish-everywhere target: chat ${item.telegramDefaultChatId}`
                            : 'No publish-everywhere target set yet'}
                        </Text>
                        <Text style={styles.telegramIdentitySub}>
                          {item.telegramDefaultChatId
                            ? 'The composer\'s "Also post to Telegram" toggle sends here.'
                            : 'Message your bot, open Recent activity below, then tap "Set as default" on a chat.'}
                        </Text>
                      </View>

                      {telegramActivityOpen && (
                        telegramUpdatesLoading ? (
                          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 8 }} />
                        ) : telegramUpdatesError ? (
                          <TouchableOpacity onPress={loadTelegramActivity}>
                            <Text style={styles.telegramEmptyText}>Couldn't load recent activity — tap to retry.</Text>
                          </TouchableOpacity>
                        ) : telegramUpdates && telegramUpdates.length > 0 ? (
                          telegramUpdates.map((u) => {
                            const isDefault = item.telegramDefaultChatId === u.chatId;
                            return (
                              <View key={u.updateId} style={styles.telegramUpdateRow}>
                                <Text style={styles.telegramUpdateFrom}>
                                  {u.fromUsername ? `@${u.fromUsername}` : u.fromFirstName || 'Someone'}
                                </Text>
                                <Text style={styles.telegramUpdateText}>{u.text || '(non-text message)'}</Text>
                                <Text style={styles.telegramUpdateMeta}>
                                  {new Date(u.date * 1000).toLocaleString()} · chat {u.chatId}
                                </Text>
                                <TouchableOpacity
                                  style={[styles.telegramSmallBtn, { marginTop: 6, alignSelf: 'flex-start' }, isDefault && { opacity: 0.5 }]}
                                  disabled={isDefault || settingDefaultChatId === u.chatId}
                                  onPress={() => setDefaultChat(u.chatId)}
                                >
                                  {settingDefaultChatId === u.chatId ? (
                                    <ActivityIndicator color={COLORS.text} size="small" />
                                  ) : (
                                    <Ionicons name={isDefault ? 'checkmark-circle' : 'radio-button-off-outline'} size={13} color={COLORS.text} />
                                  )}
                                  <Text style={styles.telegramSmallBtnText}>{isDefault ? 'Default target' : 'Set as default'}</Text>
                                </TouchableOpacity>
                              </View>
                            );
                          })
                        ) : (
                          <Text style={styles.telegramEmptyText}>
                            No new messages yet — message @{item.accountLabel?.replace('@', '') || 'your bot'} on Telegram to see it show up here.
                          </Text>
                        )
                      )}
                    </>
                  )}
                  {!item.connected && item.configured && (
                    <>
                      <Text style={styles.telegramHint}>
                        Get a bot token from @BotFather in Telegram (send it /newbot), then paste it here.
                      </Text>
                      <View style={styles.telegramInputRow}>
                        <TextInput
                          style={styles.telegramInput}
                          placeholder="123456789:AA..."
                          placeholderTextColor={COLORS.textMuted}
                          value={telegramTokenInput}
                          onChangeText={setTelegramTokenInput}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                        <TouchableOpacity
                          style={[styles.connectBtn, !telegramTokenInput.trim() && { opacity: 0.4 }]}
                          disabled={!telegramTokenInput.trim() || telegramConnecting}
                          onPress={connectTelegram}
                        >
                          {telegramConnecting ? (
                            <ActivityIndicator color="#FFF" size="small" />
                          ) : (
                            <Text style={styles.connectText}>Connect</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                  {!item.connected && !item.configured && (
                    <Text style={styles.telegramHint}>
                      This deployment hasn't been set up to store connected-app credentials yet (INTEGRATIONS_ENCRYPTION_KEY isn't configured), so Telegram can't be connected here right now.
                    </Text>
                  )}
                </View>
              );
            }

            // WhatsApp gets its own row shape too: no system-browser
            // redirect, a two-field paste-in (system-user access token +
            // phone_number_id, both from Meta Business Manager) that calls
            // the real connect endpoint (see connectWhatsApp above) — an
            // honest "paste both credentials" flow, not a disabled button
            // implying an OAuth redirect that doesn't exist for this
            // provider.
            if (item.provider === 'whatsapp') {
              return (
                <View key="whatsapp" style={styles.telegramRow}>
                  <View style={styles.telegramTop}>
                    <View style={styles.icon}>
                      <Ionicons name={PROVIDER_ICON.whatsapp as any} size={20} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>{item.label}</Text>
                      {item.connected ? (
                        <Text style={styles.sub}>{item.accountLabel || 'Connected'}</Text>
                      ) : !item.configured ? (
                        <Text style={styles.notReadyText}>Not available in this environment yet</Text>
                      ) : (
                        <Text style={styles.sub}>Not connected</Text>
                      )}
                    </View>
                    {item.connected && (
                      <TouchableOpacity style={styles.disconnectBtn} onPress={() => disconnect('whatsapp', 'WhatsApp')}>
                        <Text style={styles.disconnectText}>Disconnect</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {!item.connected && item.configured && (
                    <>
                      <Text style={styles.telegramHint}>
                        Get a permanent system-user access token and phone number ID from Meta Business Manager (business.facebook.com), then paste both here.
                      </Text>
                      <TextInput
                        style={styles.telegramInput}
                        placeholder="Access token (EAAG...)"
                        placeholderTextColor={COLORS.textMuted}
                        value={whatsappTokenInput}
                        onChangeText={setWhatsappTokenInput}
                        autoCapitalize="none"
                        autoCorrect={false}
                        secureTextEntry
                      />
                      <View style={styles.telegramInputRow}>
                        <TextInput
                          style={styles.telegramInput}
                          placeholder="Phone number ID"
                          placeholderTextColor={COLORS.textMuted}
                          value={whatsappPhoneIdInput}
                          onChangeText={setWhatsappPhoneIdInput}
                          autoCapitalize="none"
                          autoCorrect={false}
                          keyboardType="number-pad"
                        />
                        <TouchableOpacity
                          style={[
                            styles.connectBtn,
                            (!whatsappTokenInput.trim() || !whatsappPhoneIdInput.trim()) && { opacity: 0.4 },
                          ]}
                          disabled={!whatsappTokenInput.trim() || !whatsappPhoneIdInput.trim() || whatsappConnecting}
                          onPress={connectWhatsApp}
                        >
                          {whatsappConnecting ? (
                            <ActivityIndicator color="#FFF" size="small" />
                          ) : (
                            <Text style={styles.connectText}>Connect</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                  {!item.connected && !item.configured && (
                    <Text style={styles.telegramHint}>
                      This deployment hasn't been set up to store connected-app credentials yet (INTEGRATIONS_ENCRYPTION_KEY isn't configured), so WhatsApp can't be connected here right now.
                    </Text>
                  )}
                </View>
              );
            }

            return (
              <View key={item.provider} style={styles.row}>
                <View style={styles.icon}>
                  <Ionicons name={PROVIDER_ICON[item.provider] as any} size={20} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{item.label}</Text>
                  {item.connected ? (
                    <Text style={styles.sub}>{item.accountLabel || 'Connected'}</Text>
                  ) : !item.configured ? (
                    <Text style={styles.notReadyText}>Not available in this environment yet</Text>
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
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
