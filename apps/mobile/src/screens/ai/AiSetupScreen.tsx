import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';

const GENDERS = [
  { key: 'female', label: 'Female', icon: 'female' },
  { key: 'male', label: 'Male', icon: 'male' },
  { key: 'neutral', label: 'Neutral', icon: 'sparkles' },
];

const VOICES = [
  { key: 'warm', label: 'Warm', blurb: 'Friendly and caring' },
  { key: 'calm', label: 'Calm', blurb: 'Soft and steady' },
  { key: 'energetic', label: 'Energetic', blurb: 'Upbeat and lively' },
  { key: 'wise', label: 'Wise', blurb: 'Thoughtful and deep' },
];

const PERSONALITIES = [
  { key: 'companion', label: 'Companion', blurb: 'A loyal friend by your side' },
  { key: 'coach', label: 'Coach', blurb: 'Pushes you to be better' },
  { key: 'professional', label: 'Professional', blurb: 'Efficient and precise' },
  { key: 'playful', label: 'Playful', blurb: 'Fun, jokes, good vibes' },
];

export default function AiSetupScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const [name, setName] = useState('');
  const [gender, setGender] = useState('neutral');
  const [voice, setVoice] = useState('warm');
  const [personality, setPersonality] = useState('companion');

  const canContinue = name.trim().length >= 2;

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, RADIUS, SPACING }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    hero: {
      margin: SPACING.lg,
      borderRadius: RADIUS.lg,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1, borderColor: COLORS.glassBorder,
    },
    orb: {
      width: 68, height: 68, borderRadius: 34,
      backgroundColor: 'rgba(139,92,246,0.4)',
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
    },
    heroTitle: { color: COLORS.text, fontSize: 22, fontWeight: '800', marginTop: 12 },
    heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 19 },
    sectionLabel: {
      ...TYPOGRAPHY.label, fontSize: 11,
      paddingHorizontal: SPACING.lg, marginTop: SPACING.lg, marginBottom: SPACING.md,
    },
    nameInput: {
      marginHorizontal: SPACING.lg,
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      color: COLORS.text,
      padding: 14, fontSize: 16,
    },
    chipRow: { flexDirection: 'row', gap: 10, paddingHorizontal: SPACING.lg },
    chip: {
      flex: 1, flexDirection: 'row', gap: 6,
      justifyContent: 'center', alignItems: 'center',
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.pill,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      paddingVertical: 10,
    },
    chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 13 },
    cardGrid: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 10,
      paddingHorizontal: SPACING.lg,
    },
    card: {
      width: '48%',
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      padding: 14,
    },
    cardActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(139,92,246,0.15)' },
    cardLabel: { color: COLORS.textMuted, fontWeight: '800', fontSize: 14 },
    cardBlurb: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
    continueBtn: {
      flexDirection: 'row', gap: 8,
      margin: SPACING.lg, marginTop: SPACING.xl,
      backgroundColor: COLORS.primary,
      borderRadius: RADIUS.pill,
      paddingVertical: 15,
      justifyContent: 'center', alignItems: 'center',
    },
    continueText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  }));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <LinearGradient colors={['#3A0E6E', '#200840']} style={styles.hero}>
          <View style={styles.orb}>
            <Ionicons name="sparkles" size={34} color="#FFF" />
          </View>
          <Text style={styles.heroTitle}>Meet your AI</Text>
          <Text style={styles.heroSub}>
            Your personal companion inside Guranda. It learns your life, wakes you
            up on time, books your rides and keeps you company. First — make it yours.
          </Text>
        </LinearGradient>

        <Text style={styles.sectionLabel}>NAME YOUR COMPANION</Text>
        <TextInput
          style={styles.nameInput}
          placeholder="e.g. Aura, Neo, Thandi…"
          placeholderTextColor={COLORS.textMuted}
          value={name}
          onChangeText={setName}
          maxLength={20}
        />

        <Text style={styles.sectionLabel}>GENDER</Text>
        <View style={styles.chipRow}>
          {GENDERS.map(g => (
            <TouchableOpacity
              key={g.key}
              style={[styles.chip, gender === g.key && styles.chipActive]}
              onPress={() => setGender(g.key)}
            >
              <Ionicons name={g.icon as any} size={16} color={gender === g.key ? '#FFF' : COLORS.textMuted} />
              <Text style={[styles.chipText, gender === g.key && { color: '#FFF' }]}>{g.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>VOICE</Text>
        <View style={styles.cardGrid}>
          {VOICES.map(v => (
            <TouchableOpacity
              key={v.key}
              style={[styles.card, voice === v.key && styles.cardActive]}
              onPress={() => setVoice(v.key)}
            >
              <Text style={[styles.cardLabel, voice === v.key && { color: COLORS.text }]}>{v.label}</Text>
              <Text style={styles.cardBlurb}>{v.blurb}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>PERSONALITY</Text>
        <View style={styles.cardGrid}>
          {PERSONALITIES.map(p => (
            <TouchableOpacity
              key={p.key}
              style={[styles.card, personality === p.key && styles.cardActive]}
              onPress={() => setPersonality(p.key)}
            >
              <Text style={[styles.cardLabel, personality === p.key && { color: COLORS.text }]}>{p.label}</Text>
              <Text style={styles.cardBlurb}>{p.blurb}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.continueBtn, !canContinue && { opacity: 0.4 }]}
          disabled={!canContinue}
          onPress={() =>
            navigation.navigate('AiAccess', {
              config: { name: name.trim(), gender, voice, personality },
            })
          }
        >
          <Text style={styles.continueText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFF" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
