import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';

// One entry per grantable capability. Fetched from GET /ai/tools (the Tool
// Registry) instead of a hardcoded list — any module that registers a new
// AI tool shows up here automatically, with no screen changes needed.
interface PermissionItem {
  permissionKey: string;
  module: string;
  description: string;
  sensitive: boolean;
  defaultGranted: boolean;
}

const MODULE_ICONS: Record<string, string> = {
  wallet: 'wallet-outline',
  ride: 'car-outline',
  calendar: 'alarm-outline',
  games: 'game-controller-outline',
  travel: 'airplane-outline',
  property: 'home-outline',
  miniapps: 'apps-outline',
  settings: 'person-outline',
  contacts: 'people-outline',
  carfind: 'car-sport-outline',
  marketplace: 'pricetags-outline',
  shopping: 'bag-outline',
  work: 'briefcase-outline',
  learning: 'school-outline',
  hair: 'cut-outline',
  entertainment: 'film-outline',
  eat: 'restaurant-outline',
  finance: 'cash-outline',
  health: 'fitness-outline',
};
const DEFAULT_ICON = 'sparkles-outline';

function humanizeLabel(permissionKey: string, module: string): string {
  const action = permissionKey.split('.')[1];
  const moduleLabel = module.charAt(0).toUpperCase() + module.slice(1);
  if (!action) return moduleLabel;
  return `${moduleLabel}: ${action.charAt(0).toUpperCase() + action.slice(1)}`;
}

export default function AiAccessScreen({ navigation, route }: any) {
  // Two entry points share this screen:
  //  - Onboarding (AiSetupScreen passes `config`): creates a brand-new agent,
  //    then continues to the guided tour.
  //  - Profile > Settings (no params): edits an *existing* agent's real
  //    permissions in place. It must load the agent's real name/voice/etc and
  //    its real saved permissions first — sending the onboarding defaults here
  //    would silently overwrite the user's actual agent identity and reset
  //    every permission to its factory default.
  const setupConfig = route.params?.config;
  const isOnboarding = !!setupConfig;
  const [config, setConfig] = useState(setupConfig || { name: 'AI', gender: 'neutral', voice: 'warm', personality: 'companion' });
  const [tools, setTools] = useState<PermissionItem[]>([]);
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [handsFreeMode, setHandsFreeMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING, TYPOGRAPHY }) => ({
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
    notice: {
      flexDirection: 'row', gap: 12, alignItems: 'center',
      marginHorizontal: SPACING.lg,
      borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      padding: 16,
    },
    noticeText: { color: 'rgba(255,255,255,0.85)', fontSize: 12.5, lineHeight: 18, flex: 1 },
    sectionLabel: {
      ...TYPOGRAPHY.label, fontSize: 11,
      paddingHorizontal: SPACING.lg, marginTop: SPACING.xl, marginBottom: SPACING.md,
    },
    sectionRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, marginTop: SPACING.xl, marginBottom: SPACING.md,
    },
    bulkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    bulkLink: { color: COLORS.primary, fontSize: 11.5, fontWeight: '700' },
    bulkDivider: { color: COLORS.textMuted, fontSize: 11.5 },
    list: { paddingHorizontal: SPACING.lg, gap: 10 },
    permRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      padding: 12,
    },
    permIcon: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: 'rgba(139,92,246,0.15)',
      justifyContent: 'center', alignItems: 'center',
    },
    permLabel: { color: COLORS.text, fontWeight: '700', fontSize: 13.5 },
    permBlurb: { color: COLORS.textMuted, fontSize: 11.5, marginTop: 2, lineHeight: 15 },
    activateBtn: {
      flexDirection: 'row', gap: 8,
      margin: SPACING.lg, marginTop: SPACING.xl,
      backgroundColor: COLORS.primary,
      borderRadius: RADIUS.pill,
      paddingVertical: 15,
      justifyContent: 'center', alignItems: 'center',
    },
    activateText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
    footnote: { color: COLORS.textMuted, fontSize: 11, textAlign: 'center' },
  }));

  useEffect(() => {
    (async () => {
      try {
        const [toolsRes, agentRes] = await Promise.all([
          fetchApi('/ai/tools'),
          isOnboarding ? Promise.resolve(null) : fetchApi('/ai/agent'),
        ]);
        const list: PermissionItem[] = toolsRes.ok ? await toolsRes.json() : [];
        setTools(list);

        const agent = agentRes && agentRes.ok ? await agentRes.json() : null;
        const existingPerms: Record<string, boolean> | null =
          agent && agent.exists !== false ? (agent.permissions || {}) : null;

        if (!isOnboarding && !existingPerms) {
          // Opened from Settings but the user never finished onboarding —
          // send them through proper setup (name/personality) instead of
          // silently creating a bland default-named agent here.
          navigation.replace('AiSetup');
          return;
        }

        if (existingPerms && !isOnboarding) {
          setConfig({ name: agent.name, gender: agent.gender, voice: agent.voice, personality: agent.personality });
          setHandsFreeMode(!!agent.handsFreeMode);
        }

        const initial: Record<string, boolean> = {};
        list.forEach(t => {
          initial[t.permissionKey] = existingPerms && t.permissionKey in existingPerms
            ? !!existingPerms[t.permissionKey]
            : t.defaultGranted;
        });
        setPerms(initial);
      } catch {
        setTools([]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (key: string) => setPerms(p => ({ ...p, [key]: !p[key] }));

  const activate = async () => {
    try {
      setSaving(true);
      // In settings-edit mode, send permissions only — omitting name/gender/
      // voice/personality means the update leaves those fields untouched
      // rather than overwriting the real agent with placeholder defaults.
      const body = isOnboarding
        ? { ...config, permissions: perms, handsFreeMode }
        : { permissions: perms, handsFreeMode };
      const res = await fetchApi('/ai/agent', { method: 'POST', body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Could not save your AI setup');
      if (isOnboarding) {
        navigation.replace('AiTour', { config });
      } else {
        Alert.alert('Saved', `${config.name}'s access has been updated.`);
        navigation.goBack();
      }
    } catch (e: any) {
      Alert.alert('Setup failed', e.message || 'Please try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={TYPOGRAPHY.h2}>Access for {config.name}</Text>
          <View style={{ width: 40 }} />
        </View>

        <LinearGradient colors={['#3A0E6E', '#200840']} style={styles.notice}>
          <Ionicons name="shield-checkmark" size={22} color={COLORS.success} />
          <Text style={styles.noticeText}>
            You are in control. {config.name} can only see what you allow here — and
            every action that moves money, books a ride or sets an alarm must be
            approved by you first, every time.
          </Text>
        </LinearGradient>

        <Text style={styles.sectionLabel}>TALK MODE</Text>
        <View style={styles.list}>
          <View style={styles.permRow}>
            <View style={styles.permIcon}>
              <Ionicons name="mic-outline" size={18} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.permLabel}>Hands-free mode</Text>
              <Text style={styles.permBlurb}>Talk to {config.name} out loud instead of typing — it listens and replies with voice.</Text>
            </View>
            <Switch
              value={handsFreeMode}
              onValueChange={setHandsFreeMode}
              trackColor={{ false: COLORS.surfaceElevated, true: COLORS.primary }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        <View style={styles.sectionRow}>
          <Text style={[styles.sectionLabel, { marginTop: 0, marginBottom: 0, paddingHorizontal: 0 }]}>
            WHAT {config.name.toUpperCase()} CAN ACCESS
          </Text>
          {!loading && tools.length > 0 && (
            <View style={styles.bulkRow}>
              <TouchableOpacity onPress={() => setPerms(Object.fromEntries(tools.map(t => [t.permissionKey, true])))}>
                <Text style={styles.bulkLink}>Allow all</Text>
              </TouchableOpacity>
              <Text style={styles.bulkDivider}>·</Text>
              <TouchableOpacity onPress={() => setPerms(Object.fromEntries(tools.map(t => [t.permissionKey, false])))}>
                <Text style={styles.bulkLink}>Restrict all</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 30 }} />
        ) : (
          <View style={styles.list}>
            {tools.map(t => (
              <View key={t.permissionKey} style={styles.permRow}>
                <View style={[styles.permIcon, t.sensitive && { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                  <Ionicons
                    name={(MODULE_ICONS[t.module] || DEFAULT_ICON) as any}
                    size={18}
                    color={t.sensitive ? '#EF4444' : COLORS.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.permLabel}>{humanizeLabel(t.permissionKey, t.module)}</Text>
                  <Text style={styles.permBlurb}>{t.description}</Text>
                </View>
                <Switch
                  value={!!perms[t.permissionKey]}
                  onValueChange={() => toggle(t.permissionKey)}
                  trackColor={{ false: COLORS.surfaceElevated, true: COLORS.primary }}
                  thumbColor="#FFF"
                />
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.activateBtn} onPress={activate} disabled={saving || loading}>
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color="#FFF" />
              <Text style={styles.activateText}>{isOnboarding ? `Activate ${config.name}` : 'Save changes'}</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.footnote}>You can change these permissions anytime.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
