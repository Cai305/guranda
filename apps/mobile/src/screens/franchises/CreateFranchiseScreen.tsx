import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';

// Real "Create Franchise Location" flow — mints a new child Username beneath
// the business's existing root brand alias (Phase 7). Free (no MINT_PRICE):
// this is business tenancy setup, not a marketplace claim.
export default function CreateFranchiseScreen({ navigation, route }: any) {
  const { businessId, parentUsernameId, parentLabel } = route.params;
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const [label, setLabel] = useState('');
  const [availability, setAvailability] = useState<{ available: boolean; reason?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING, TYPOGRAPHY }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    body: { padding: SPACING.lg },
    hint: { color: COLORS.textMuted, fontSize: 13, marginBottom: SPACING.lg, lineHeight: 18 },
    label: { ...TYPOGRAPHY.label, marginBottom: 6 },
    prefixRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    prefixChip: {
      backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
      borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 14,
    },
    prefixChipText: { color: COLORS.textMuted, fontWeight: '700' },
    input: {
      flex: 1, backgroundColor: COLORS.surface, color: COLORS.text, padding: SPACING.md,
      borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    },
    availabilityText: { fontSize: 12.5, fontWeight: '700', marginTop: 8 },
    submitBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', marginTop: SPACING.xl },
    submitBtnText: { color: '#fff', fontWeight: '800' },
  }));

  const onChangeLabel = (text: string) => {
    const clean = text.replace(/[^a-zA-Z0-9_]/g, '');
    setLabel(clean);
    setAvailability(null);
    if (checkTimer.current) clearTimeout(checkTimer.current);
    if (clean.trim().length < 3) return;
    checkTimer.current = setTimeout(() => {
      fetchApi(`/usernames/check?label=${encodeURIComponent(clean)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then(setAvailability)
        .catch(() => {});
    }, 400);
  };

  const submit = async () => {
    if (!availability?.available) return;
    setSubmitting(true);
    try {
      const res = await fetchApi('/franchises/alias', {
        method: 'POST',
        body: JSON.stringify({ businessId, parentUsernameId, newAliasName: label }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Could not create franchise location');
      Alert.alert('Location created', `@${d.label} is now live under @${parentLabel}. Add staff to give them access.`, [
        { text: 'Add staff now', onPress: () => navigation.replace('FranchiseStaff', { franchiseUsernameId: d.id, franchiseLabel: d.label }) },
        { text: 'Later', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>New Location</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.hint}>
          Creates a new alias beneath @{parentLabel} with its own staff, campaigns and content — clearly distinct from your brand's global presence.
        </Text>

        <Text style={styles.label}>Location handle</Text>
        <View style={styles.prefixRow}>
          <View style={styles.prefixChip}><Text style={styles.prefixChipText}>@</Text></View>
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={onChangeLabel}
            placeholder={`${parentLabel}_makhado`}
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
          />
        </View>
        {label.trim().length >= 3 && availability && (
          <Text style={[styles.availabilityText, { color: availability.available ? '#10B981' : '#F87171' }]}>
            {availability.available ? 'Available!' : availability.reason}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, (!availability?.available || submitting) && { opacity: 0.5 }]}
          onPress={submit}
          disabled={!availability?.available || submitting}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create Location</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
