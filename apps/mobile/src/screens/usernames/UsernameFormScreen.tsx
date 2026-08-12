import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../theme';
import { fetchApi } from '../../utils/api';

const DURATIONS = [
  { hours: 24, label: '1 day' },
  { hours: 72, label: '3 days' },
  { hours: 168, label: '7 days' },
];

// Lists an EXISTING owned Username for sale — unlike Marketplace's form,
// this doesn't create the asset (that's mint/claim, done from
// MyUsernamesScreen or registration); it just puts one up for sale.
export default function UsernameFormScreen({ navigation, route }: any) {
  const { usernameId, label } = route.params || {};
  const [listingType, setListingType] = useState<'FIXED' | 'AUCTION'>('FIXED');
  const [price, setPrice] = useState('');
  const [durationHours, setDurationHours] = useState(24);
  const [saving, setSaving] = useState(false);

  const canSave = price.trim().length > 0;

  const save = async () => {
    try {
      setSaving(true);
      const res = await fetchApi(`/usernames/${usernameId}/listing`, {
        method: 'POST',
        body: JSON.stringify({
          listingType,
          price: parseFloat(price),
          durationHours: listingType === 'AUCTION' ? durationHours : undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Could not list username');
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Listing failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>List @{label}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.label}>SALE TYPE</Text>
        <View style={styles.chipRowFixed}>
          <TouchableOpacity style={[styles.chip, { flex: 1 }, listingType === 'FIXED' && styles.chipActive]} onPress={() => setListingType('FIXED')}>
            <Text style={[styles.chipText, listingType === 'FIXED' && { color: '#1A0B33' }]}>Fixed Price</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.chip, { flex: 1 }, listingType === 'AUCTION' && styles.chipActive]} onPress={() => setListingType('AUCTION')}>
            <Text style={[styles.chipText, listingType === 'AUCTION' && { color: '#1A0B33' }]}>Auction</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>{listingType === 'AUCTION' ? 'STARTING BID (R)' : 'PRICE (R)'}</Text>
        <TextInput style={styles.input} placeholder="e.g. 500" placeholderTextColor={COLORS.textMuted} value={price} onChangeText={setPrice} keyboardType="numeric" />

        {listingType === 'AUCTION' && (
          <>
            <Text style={styles.label}>AUCTION DURATION</Text>
            <View style={styles.chipRowFixed}>
              {DURATIONS.map(d => (
                <TouchableOpacity key={d.hours} style={[styles.chip, { flex: 1 }, durationHours === d.hours && styles.chipActive]} onPress={() => setDurationHours(d.hours)}>
                  <Text style={[styles.chipText, durationHours === d.hours && { color: '#1A0B33' }]}>{d.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text style={styles.hint}>Its reputation score ({`transfers with a sale`}) is part of what makes an established handle worth more — the buyer inherits it the moment they activate it.</Text>

        <TouchableOpacity style={[styles.saveBtn, !canSave && { opacity: 0.4 }]} disabled={!canSave || saving} onPress={save}>
          {saving ? <ActivityIndicator color="#FFF" /> : (
            <>
              <Ionicons name="checkmark" size={18} color="#FFF" />
              <Text style={styles.saveText}>{listingType === 'AUCTION' ? 'Start Auction' : 'List Username'}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#150A2E' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: RADIUS.pill,
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    justifyContent: 'center', alignItems: 'center',
  },
  label: {
    ...TYPOGRAPHY.label, fontSize: 11,
    paddingHorizontal: SPACING.lg, marginTop: SPACING.lg, marginBottom: 8,
  },
  input: {
    marginHorizontal: SPACING.lg,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.glassBorder,
    color: COLORS.text, padding: 13, fontSize: 14,
  },
  chipRowFixed: { flexDirection: 'row', gap: 8, paddingHorizontal: SPACING.lg },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.glassBorder,
    paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center',
  },
  chipActive: { backgroundColor: '#A78BFA', borderColor: '#A78BFA' },
  chipText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 12.5 },
  hint: { color: COLORS.textMuted, fontSize: 12, lineHeight: 17, paddingHorizontal: SPACING.lg, marginTop: SPACING.lg },
  saveBtn: {
    flexDirection: 'row', gap: 8,
    margin: SPACING.lg, marginTop: SPACING.xl,
    backgroundColor: '#7C3AED', borderRadius: RADIUS.pill,
    paddingVertical: 15, justifyContent: 'center', alignItems: 'center',
  },
  saveText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
});
