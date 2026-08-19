import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { invalidateCachedResponse } from '../../utils/apiCache';

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

// Only the modules whose plain-capitalized key would read oddly.
const MODULE_LABELS: Record<string, string> = {
  carfind: 'CarFind',
  miniapps: 'Mini Apps',
};

function humanizeLabel(permissionKey: string, module: string): string {
  const action = permissionKey.split('.')[1];
  const moduleLabel = moduleTitle(module);
  if (!action) return moduleLabel;
  return `${moduleLabel}: ${action.charAt(0).toUpperCase() + action.slice(1)}`;
}

function moduleTitle(module: string): string {
  return MODULE_LABELS[module] || module.charAt(0).toUpperCase() + module.slice(1);
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
  const [toolsError, setToolsError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const toggleModule = (module: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module); else next.add(module);
      return next;
    });
  };
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
    moduleGroup: {
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      overflow: 'hidden',
    },
    moduleHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: 12,
    },
    moduleHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    moduleTitle: { color: COLORS.text, fontWeight: '700', fontSize: 13.5 },
    moduleCount: {
      backgroundColor: COLORS.surfaceElevated,
      borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1,
    },
    moduleCountText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
    moduleSensitiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
    permRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      padding: 12,
    },
    permRowNested: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 12, paddingVertical: 10,
      borderTopWidth: 1, borderTopColor: COLORS.glassBorder,
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
    errorState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: SPACING.xl },
    errorTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14.5, marginTop: 10 },
    errorBody: { color: COLORS.textMuted, fontSize: 12.5, marginTop: 4, textAlign: 'center' },
    retryBtn: {
      marginTop: 16, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
      borderRadius: RADIUS.pill, paddingVertical: 8, paddingHorizontal: 20,
    },
    retryBtnText: { color: COLORS.text, fontWeight: '700', fontSize: 12.5 },
  }));

  const loadTools = React.useCallback(async () => {
    setLoading(true);
    setToolsError(false);
    try {
      const [toolsRes, agentRes] = await Promise.all([
        fetchApi('/ai/tools'),
        isOnboarding ? Promise.resolve(null) : fetchApi('/ai/agent'),
      ]);
      if (!toolsRes.ok) throw new Error('Failed to load permissions');
      const list: PermissionItem[] = await toolsRes.json();
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
      // Distinct from "zero tools registered" — a fetch failure must not
      // silently render an empty, seemingly-complete permission list that
      // lets a user Activate with no permissions granted and no idea why.
      setTools([]);
      setToolsError(true);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadTools(); }, [loadTools]);

  const toggle = (key: string) => setPerms(p => ({ ...p, [key]: !p[key] }));

  // Grouped by module (order = first appearance in the tool registry
  // response) instead of one flat 70-row list with a single generic banner
  // at the top — each group's own count and "why it matters" line is what
  // actually makes ~70 individual permissions reviewable.
  const groupedTools = React.useMemo(() => {
    const order: string[] = [];
    const byModule: Record<string, PermissionItem[]> = {};
    for (const t of tools) {
      if (!byModule[t.module]) { byModule[t.module] = []; order.push(t.module); }
      byModule[t.module].push(t);
    }
    return order.map(module => ({
      module,
      items: byModule[module],
      sensitiveCount: byModule[module].filter(t => t.sensitive).length,
    }));
  }, [tools]);

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
      // HomeScreen re-checks GET /ai/agent on every mount and routes back
      // here whenever it reads exists:false — without invalidating that
      // cached read, a freshly-created agent stays invisible to it for up
      // to the cache's 5-minute TTL, looping the user through setup again.
      await invalidateCachedResponse('/ai/agent');
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
        ) : toolsError ? (
          <View style={styles.errorState}>
            <Ionicons name="cloud-offline-outline" size={28} color={COLORS.textMuted} />
            <Text style={styles.errorTitle}>Couldn't load permissions</Text>
            <Text style={styles.errorBody}>Check your connection and try again.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadTools}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.list}>
            {groupedTools.map(({ module, items, sensitiveCount }) => {
              const isOpen = expandedModules.has(module);
              return (
                <View key={module} style={styles.moduleGroup}>
                  <TouchableOpacity style={styles.moduleHeader} onPress={() => toggleModule(module)} activeOpacity={0.7}>
                    <View style={styles.moduleHeaderLeft}>
                      <Ionicons name={(MODULE_ICONS[module] || DEFAULT_ICON) as any} size={16} color={COLORS.primary} />
                      <Text style={styles.moduleTitle}>{moduleTitle(module)}</Text>
                      <View style={styles.moduleCount}>
                        <Text style={styles.moduleCountText}>{items.length}</Text>
                      </View>
                      {sensitiveCount > 0 && <View style={styles.moduleSensitiveDot} />}
                    </View>
                    <Ionicons name={isOpen ? 'chevron-down' : 'chevron-forward'} size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                  {isOpen && items.map(t => (
                    <View key={t.permissionKey} style={styles.permRowNested}>
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
              );
            })}
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
