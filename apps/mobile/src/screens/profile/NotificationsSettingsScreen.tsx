import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Switch, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';

const STORAGE_KEY = '@mxit_notifications_settings';

export default function NotificationsSettingsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    pushNotifications: true,
    directMessages: true,
    communityUpdates: false,
    walletTransactions: true,
    soundVibration: true,
  });

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

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load notification settings', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSetting = async (key: keyof typeof settings) => {
    try {
      const updated = { ...settings, [key]: !settings[key] };
      setSettings(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save notification settings', e);
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

  const renderToggle = (key: keyof typeof settings, label: string, description: string, icon: string) => (
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
        value={settings[key]}
        onValueChange={() => toggleSetting(key)}
        trackColor={{ false: COLORS.border, true: COLORS.primaryDeep }}
        thumbColor={settings[key] ? COLORS.primary : COLORS.textMuted}
      />
    </View>
  );

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
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.card}>
          {renderToggle('pushNotifications', 'Push Notifications', 'Receive real-time alerts on your device', 'notifications-outline')}
          <View style={styles.divider} />
          {renderToggle('directMessages', 'Direct Messages', 'Get notified when you receive a message', 'chatbubble-ellipses-outline')}
          <View style={styles.divider} />
          {renderToggle('communityUpdates', 'Community Activity', 'Alerts on communities you follow', 'people-outline')}
          <View style={styles.divider} />
          {renderToggle('walletTransactions', 'Wallet Transactions', 'Notifications on deposits, transfers, and payouts', 'wallet-outline')}
        </View>

        <Text style={styles.sectionTitle}>System</Text>
        <View style={styles.card}>
          {renderToggle('soundVibration', 'Sound & Vibration', 'Play sounds and vibrate for notifications', 'volume-high-outline')}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
