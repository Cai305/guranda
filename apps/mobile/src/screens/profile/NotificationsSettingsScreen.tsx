import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Switch, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';

// Real, server-enforced preferences (NotificationPreference on the API) —
// every category here maps to an actual sendCategorizedPush call site (see
// apps/api/src/common/push.ts), not an invented taxonomy. Replaces the old
// AsyncStorage-only version of this screen, which looked real but the
// backend never actually checked before sending a push.
interface Preferences {
  pushEnabled: boolean;
  messages: boolean;
  calls: boolean;
  social: boolean;
  achievements: boolean;
  reminders: boolean;
  approvals: boolean;
  games: boolean;
  soundEnabled: boolean;
}

const DEFAULTS: Preferences = {
  pushEnabled: true, messages: true, calls: true, social: true,
  achievements: true, reminders: true, approvals: true, games: true,
  soundEnabled: true,
};

export default function NotificationsSettingsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/notifications/preferences');
      if (res.ok) {
        const d = await res.json();
        setPrefs({ ...DEFAULTS, ...d });
      }
    } catch (e) {
      console.error('Failed to load notification preferences', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const styles = useThemedStyles(({ COLORS, SPACING, TYPOGRAPHY, RADIUS }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    content: { padding: SPACING.lg },
    sectionTitle: {
      ...TYPOGRAPHY.label,
      fontSize: 12,
      marginBottom: SPACING.sm,
      marginTop: SPACING.md,
    },
    card: {
      backgroundColor: COLORS.glass,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.lg,
      overflow: 'hidden',
      marginBottom: SPACING.lg,
    },
    cardDisabled: { opacity: 0.45 },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: SPACING.md,
    },
    settingInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: SPACING.md,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.sm,
      backgroundColor: 'rgba(139, 92, 246, 0.12)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.md,
    },
    textContainer: { flex: 1 },
    settingLabel: {
      color: COLORS.text,
      fontSize: 15,
      fontWeight: '600',
    },
    settingDesc: {
      ...TYPOGRAPHY.caption,
      color: COLORS.textMuted,
      marginTop: 2,
    },
    divider: {
      height: 1,
      backgroundColor: COLORS.glassBorder,
    },
  }));

  // Optimistic — flips locally immediately, PATCHes in the background, and
  // reverts on failure so the switch never lies about what's actually saved.
  const toggle = async (key: keyof Preferences) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      const res = await fetchApi('/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ [key]: next[key] }),
      });
      if (!res.ok) throw new Error();
    } catch (e) {
      console.error('Failed to save notification preference', e);
      setPrefs(prefs); // revert
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const renderToggle = (key: keyof Preferences, label: string, description: string, icon: string, disabled = false) => (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon as any} size={20} color={COLORS.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.settingLabel}>{label}</Text>
          <Text style={styles.settingDesc}>{description}</Text>
        </View>
      </View>
      <Switch
        value={prefs[key]}
        onValueChange={() => toggle(key)}
        disabled={disabled}
        trackColor={{ false: COLORS.border, true: COLORS.primaryDeep }}
        thumbColor={prefs[key] ? COLORS.primary : COLORS.textMuted}
      />
    </View>
  );

  const categoriesDisabled = !prefs.pushEnabled;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Push Notifications</Text>
        <View style={styles.card}>
          {renderToggle('pushEnabled', 'Push Notifications', 'Turn all push notifications on or off', 'notifications-outline')}
        </View>

        <Text style={styles.sectionTitle}>By Category</Text>
        <View style={[styles.card, categoriesDisabled && styles.cardDisabled]}>
          {renderToggle('messages', 'Messages', 'New chat messages', 'chatbubble-ellipses-outline', categoriesDisabled)}
          <View style={styles.divider} />
          {renderToggle('calls', 'Calls', 'Incoming voice and video calls', 'call-outline', categoriesDisabled)}
          <View style={styles.divider} />
          {renderToggle('social', 'Social', 'Friend requests, relationship requests, couple challenges', 'people-outline', categoriesDisabled)}
          <View style={styles.divider} />
          {renderToggle('achievements', 'Achievements', 'When you unlock something new', 'ribbon-outline', categoriesDisabled)}
          <View style={styles.divider} />
          {renderToggle('reminders', 'AI Reminders', 'Wake-ups and reminders your AI has scheduled', 'alarm-outline', categoriesDisabled)}
          <View style={styles.divider} />
          {renderToggle('approvals', 'Approvals Needed', 'When your AI needs your go-ahead on something', 'shield-checkmark-outline', categoriesDisabled)}
          <View style={styles.divider} />
          {renderToggle('games', 'Game Invites', 'Card room invites from friends', 'game-controller-outline', categoriesDisabled)}
        </View>

        <Text style={styles.sectionTitle}>System</Text>
        <View style={styles.card}>
          {renderToggle('soundEnabled', 'Sound & Vibration', 'Play a sound when a notification arrives', 'volume-high-outline')}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
