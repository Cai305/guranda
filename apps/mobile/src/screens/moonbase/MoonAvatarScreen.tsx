import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAuth } from '../../context/AuthContext';
import { fetchApi } from '../../utils/api';

// MoonBase avatar builder — customise your dicebear avatar and save it to
// your Guranda profile. The avatar follows you into every Moon room.

const HAIR = [
  { key: 'shortFlat', label: 'Short' },
  { key: 'shortCurly', label: 'Curls' },
  { key: 'fro', label: 'Fro' },
  { key: 'dreads01', label: 'Dreads' },
  { key: 'bun', label: 'Bun' },
  { key: 'bob', label: 'Bob' },
  { key: 'bigHair', label: 'Big hair' },
  { key: 'shavedSides', label: 'Fade' },
];

const ACCESSORIES = [
  { key: 'none', label: 'None' },
  { key: 'round', label: 'Round specs' },
  { key: 'sunglasses', label: 'Sunnies' },
  { key: 'wayfarers', label: 'Wayfarers' },
  { key: 'kurt', label: 'Kurt' },
];

const HAIR_COLORS = ['2c1b18', '4a312c', '724133', 'a55728', 'b58143', 'd6b370', 'f59797', '65c9ff'];
const SKIN_TONES = ['614335', '9e5622', 'ae5d29', 'd08b5b', 'edb98a', 'ffdbb4'];

const OUTFITS = [
  { key: 'hoodie', label: 'Hoodie' },
  { key: 'blazerAndShirt', label: 'Blazer' },
  { key: 'graphicShirt', label: 'Graphic tee' },
  { key: 'collarAndSweater', label: 'Sweater' },
  { key: 'overall', label: 'Overall' },
  { key: 'shirtCrewNeck', label: 'Crew neck' },
];

export default function MoonAvatarScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const { user, refreshProfile } = useAuth();
  const [hair, setHair] = useState('shortCurly');
  const [accessory, setAccessory] = useState('none');
  const [hairColor, setHairColor] = useState('2c1b18');
  const [skin, setSkin] = useState('d08b5b');
  const [outfit, setOutfit] = useState('hoodie');
  const [saving, setSaving] = useState(false);

  const avatarUrl = useMemo(() => {
    const params = new URLSearchParams({
      seed: user?.username || 'moon',
      top: hair,
      hairColor,
      skinColor: skin,
      clothing: outfit,
      accessories: accessory === 'none' ? '' : accessory,
      accessoriesProbability: accessory === 'none' ? '0' : '100',
    });
    return `https://api.dicebear.com/7.x/avataaars/png?${params.toString()}&size=240`;
  }, [user?.username, hair, accessory, hairColor, skin, outfit]);

  const save = async () => {
    try {
      setSaving(true);
      const res = await fetchApi('/users/profile', {
        method: 'POST',
        body: JSON.stringify({ avatarUrl }),
      });
      if (!res.ok) throw new Error('Could not save avatar');
      await refreshProfile(); // avatar updates everywhere: home, profile, rooms
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Save failed', e.message || 'Please try again');
    } finally {
      setSaving(false);
    }
  };

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING, TYPOGRAPHY }) => ({
    root: { flex: 1, backgroundColor: '#0A0618' },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: RADIUS.pill,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      justifyContent: 'center', alignItems: 'center',
    },
    previewWrap: { alignItems: 'center', marginVertical: SPACING.md },
    previewOrbit: {
      width: 190, height: 190, borderRadius: 95,
      backgroundColor: 'rgba(139,92,246,0.15)',
      borderWidth: 2, borderColor: 'rgba(139,92,246,0.6)',
      justifyContent: 'center', alignItems: 'center',
    },
    preview: { width: 165, height: 165, borderRadius: 83 },
    sectionLabel: {
      ...TYPOGRAPHY.label, fontSize: 11,
      paddingHorizontal: SPACING.lg, marginTop: SPACING.lg, marginBottom: SPACING.md,
    },
    chipRow: { paddingHorizontal: SPACING.lg, gap: 8 },
    chip: {
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.pill,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      paddingVertical: 9, paddingHorizontal: 16,
    },
    chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 13 },
    swatchRow: { flexDirection: 'row', gap: 10, paddingHorizontal: SPACING.lg, flexWrap: 'wrap' },
    swatch: {
      width: 34, height: 34, borderRadius: 17,
      borderWidth: 2, borderColor: 'transparent',
    },
    swatchActive: { borderColor: '#FFF' },
    saveBtn: {
      flexDirection: 'row', gap: 8,
      margin: SPACING.lg, marginTop: SPACING.xl,
      backgroundColor: COLORS.primary,
      borderRadius: RADIUS.pill,
      paddingVertical: 15,
      justifyContent: 'center', alignItems: 'center',
    },
    saveText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  }));

  const renderChips = (
    label: string,
    items: { key: string; label: string }[],
    value: string,
    onPick: (v: string) => void,
  ) => (
    <>
      <Text style={styles.sectionLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {items.map(i => (
          <TouchableOpacity
            key={i.key}
            style={[styles.chip, value === i.key && styles.chipActive]}
            onPress={() => onPick(i.key)}
          >
            <Text style={[styles.chipText, value === i.key && { color: '#FFF' }]}>{i.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );

  const renderSwatches = (label: string, colors: string[], value: string, onPick: (v: string) => void) => (
    <>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.swatchRow}>
        {colors.map(c => (
          <TouchableOpacity
            key={c}
            style={[styles.swatch, { backgroundColor: `#${c}` }, value === c && styles.swatchActive]}
            onPress={() => onPick(c)}
          />
        ))}
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Your Avatar</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.previewWrap}>
          <View style={styles.previewOrbit}>
            <Image source={{ uri: avatarUrl }} style={styles.preview} />
          </View>
        </View>

        {renderChips('HAIR', HAIR, hair, setHair)}
        {renderSwatches('HAIR COLOR', HAIR_COLORS, hairColor, setHairColor)}
        {renderSwatches('SKIN TONE', SKIN_TONES, skin, setSkin)}
        {renderChips('EYEWEAR', ACCESSORIES, accessory, setAccessory)}
        {renderChips('OUTFIT', OUTFITS, outfit, setOutfit)}

        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color="#FFF" />
              <Text style={styles.saveText}>Save Avatar</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
