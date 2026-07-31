import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, GRADIENTS } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';

const STORAGE_KEY = '@mxit_appearance_settings';

const ACCENTS = [
  { id: 'violet', label: 'Violet', color: '#8B5CF6', gradient: GRADIENTS.primary },
  { id: 'cyan', label: 'Cyan', color: '#22D3EE', gradient: GRADIENTS.aurora },
  { id: 'gold', label: 'Gold', color: '#FBBF24', gradient: GRADIENTS.golden },
  { id: 'emerald', label: 'Emerald', color: '#10B981', gradient: GRADIENTS.emerald },
  { id: 'crimson', label: 'Crimson', color: '#F87171', gradient: GRADIENTS.crimson },
];

export default function AppearanceScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'system' | 'dark' | 'light'>('dark');
  const [accent, setAccent] = useState('violet');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setMode(parsed.mode ?? 'dark');
        setAccent(parsed.accent ?? 'violet');
        setFontSize(parsed.fontSize ?? 'medium');
      }
    } catch (e) {
      console.error('Failed to load appearance settings', e);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (updates: { mode?: 'system' | 'dark' | 'light'; accent?: string; fontSize?: 'small' | 'medium' | 'large' }) => {
    try {
      const current = { mode, accent, fontSize, ...updates };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch (e) {
      console.error('Failed to save appearance settings', e);
    }
  };

  const handleSelectMode = (val: 'system' | 'dark' | 'light') => {
    if (val === 'light') {
      Alert.alert(
        'Signature Dark Mode',
        'Guranda is built dark-first for battery efficiency and high-fidelity visuals. Light mode is currently under development.',
        [{ text: 'Stay Dark', style: 'default' }]
      );
      return;
    }
    setMode(val);
    saveSettings({ mode: val });
  };

  const handleSelectAccent = (val: string) => {
    setAccent(val);
    saveSettings({ accent: val });
  };

  const handleSelectFontSize = (val: 'small' | 'medium' | 'large') => {
    setFontSize(val);
    saveSettings({ fontSize: val });
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

  const selectedAccentData = ACCENTS.find(a => a.id === accent) || ACCENTS[0];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Appearance</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Preview Card */}
        <Text style={styles.sectionTitle}>Preview</Text>
        <LinearGradient
          colors={selectedAccentData.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.previewCard}
        >
          <Text style={styles.previewTextMini}>YOUR IDENTITY</Text>
          <Text style={styles.previewTextTitle}>Guranda Premium</Text>
          <Text style={styles.previewTextDesc}>
            Custom accents and modern typography tailored for your interface.
          </Text>
        </LinearGradient>

        {/* Theme Mode */}
        <Text style={styles.sectionTitle}>Theme Mode</Text>
        <View style={styles.card}>
          <View style={styles.visOptions}>
            {(['dark', 'system', 'light'] as const).map(option => (
              <TouchableOpacity
                key={option}
                style={[styles.modeBtn, mode === option && styles.modeBtnActive]}
                onPress={() => handleSelectMode(option)}
              >
                <Ionicons
                  name={option === 'dark' ? 'moon' : option === 'light' ? 'sunny' : 'phone-portrait'}
                  size={18}
                  color={mode === option ? COLORS.primary : COLORS.textMuted}
                  style={{ marginBottom: 6 }}
                />
                <Text style={[styles.modeBtnText, mode === option && styles.modeBtnTextActive]}>
                  {option === 'system' ? 'System' : option === 'dark' ? 'Dark' : 'Light'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Accent Colors */}
        <Text style={styles.sectionTitle}>Accent Color</Text>
        <View style={styles.card}>
          <View style={styles.accentGrid}>
            {ACCENTS.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.accentCircleContainer,
                  accent === item.id && { borderColor: COLORS.text }
                ]}
                onPress={() => handleSelectAccent(item.id)}
              >
                <View style={[styles.accentCircle, { backgroundColor: item.color }]} />
                <Text style={[styles.accentLabel, accent === item.id && { color: COLORS.text }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Font Size */}
        <Text style={styles.sectionTitle}>Text Size</Text>
        <View style={styles.card}>
          <View style={styles.fontSizeContainer}>
            {(['small', 'medium', 'large'] as const).map(size => (
              <TouchableOpacity
                key={size}
                style={[styles.fontSizeBtn, fontSize === size && styles.fontSizeBtnActive]}
                onPress={() => handleSelectFontSize(size)}
              >
                <Text style={[
                  styles.fontSizeText,
                  size === 'small' && { fontSize: 12 },
                  size === 'medium' && { fontSize: 14 },
                  size === 'large' && { fontSize: 16 },
                  fontSize === size && { color: COLORS.primary }
                ]}>
                  {size.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  previewCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  previewTextMini: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 1.5,
    marginBottom: SPACING.xs,
  },
  previewTextTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: SPACING.xs,
  },
  previewTextDesc: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  card: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  visOptions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  modeBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  modeBtnText: {
    color: COLORS.textMuted,
    fontWeight: '600',
    fontSize: 12,
  },
  modeBtnTextActive: {
    color: COLORS.text,
  },
  accentGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  accentCircleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 70,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  accentCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  accentLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  fontSizeContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  fontSizeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  fontSizeBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  fontSizeText: {
    color: COLORS.textMuted,
    fontWeight: '800',
  },
});
