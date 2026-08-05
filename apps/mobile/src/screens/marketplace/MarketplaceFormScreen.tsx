import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi, uploadImage } from '../../utils/api';

const CATEGORIES = ['Electronics', 'Fashion', 'Home & Garden', 'Vehicles', 'Sports', 'Books & Media', 'Toys & Games', 'Collectibles', 'Other'];
const CONDITIONS = [
  { key: 'NEW', label: 'New' },
  { key: 'LIKE_NEW', label: 'Like New' },
  { key: 'GOOD', label: 'Good' },
  { key: 'FAIR', label: 'Fair' },
];
const DURATIONS = [
  { hours: 24, label: '1 day' },
  { hours: 72, label: '3 days' },
  { hours: 168, label: '7 days' },
];

export default function MarketplaceFormScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [condition, setCondition] = useState('GOOD');
  const [listingType, setListingType] = useState<'FIXED' | 'AUCTION'>('FIXED');
  const [price, setPrice] = useState('');
  const [durationHours, setDurationHours] = useState(24);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSave = title.trim() && price.trim() && photos.length >= 1;

  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 8,
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;
    try {
      setUploading(true);
      for (const asset of result.assets) {
        const url = await uploadImage(asset.uri);
        setPhotos(prev => [...prev, url]);
      }
    } catch {
      Alert.alert('Upload failed', 'Some photos could not be uploaded — try again.');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (url: string) => setPhotos(prev => prev.filter(p => p !== url));

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING, TYPOGRAPHY }) => ({
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
    chipRow: { paddingHorizontal: SPACING.lg, gap: 8 },
    chipRowFixed: { flexDirection: 'row', gap: 8, paddingHorizontal: SPACING.lg },
    chip: {
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.glassBorder,
      paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center',
    },
    chipActive: { backgroundColor: '#A78BFA', borderColor: '#A78BFA' },
    chipText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 12.5 },
    photoRow: { paddingHorizontal: SPACING.lg, gap: 10 },
    photoWrap: { position: 'relative' },
    photo: { width: 84, height: 84, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.06)' },
    photoRemove: {
      position: 'absolute', top: -6, right: -6,
      width: 20, height: 20, borderRadius: 10,
      backgroundColor: '#DC2626', justifyContent: 'center', alignItems: 'center',
    },
    photoAdd: {
      width: 84, height: 84, borderRadius: RADIUS.md,
      borderWidth: 1.5, borderColor: 'rgba(167,139,250,0.6)', borderStyle: 'dashed',
      justifyContent: 'center', alignItems: 'center', gap: 4,
    },
    photoAddText: { color: '#A78BFA', fontSize: 11, fontWeight: '700' },
    photoHint: { color: '#F59E0B', fontSize: 11.5, paddingHorizontal: SPACING.lg, marginTop: 8 },
    saveBtn: {
      flexDirection: 'row', gap: 8,
      margin: SPACING.lg, marginTop: SPACING.xl,
      backgroundColor: '#7C3AED', borderRadius: RADIUS.pill,
      paddingVertical: 15, justifyContent: 'center', alignItems: 'center',
    },
    saveText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  }));

  const save = async () => {
    try {
      setSaving(true);
      const res = await fetchApi('/marketplace/listings', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          condition,
          listingType,
          price: parseFloat(price),
          durationHours: listingType === 'AUCTION' ? durationHours : undefined,
          images: photos,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Could not create listing');
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
        <Text style={TYPOGRAPHY.h2}>Sell Something</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.label}>PHOTOS ({photos.length})</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
          {photos.map(url => (
            <View key={url} style={styles.photoWrap}>
              <Image source={{ uri: url }} style={styles.photo} />
              <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(url)}>
                <Ionicons name="close" size={13} color="#FFF" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.photoAdd} onPress={pickPhotos} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator color="#A78BFA" size="small" />
            ) : (
              <>
                <Ionicons name="camera" size={22} color="#A78BFA" />
                <Text style={styles.photoAddText}>Add</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
        {photos.length === 0 && <Text style={styles.photoHint}>At least one photo is required.</Text>}

        <Text style={styles.label}>TITLE</Text>
        <TextInput style={styles.input} placeholder="What are you selling?" placeholderTextColor={COLORS.textMuted} value={title} onChangeText={setTitle} />

        <Text style={styles.label}>CATEGORY</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {CATEGORIES.map(c => (
            <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
              <Text style={[styles.chipText, category === c && { color: '#1A0B33' }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>CONDITION</Text>
        <View style={styles.chipRowFixed}>
          {CONDITIONS.map(c => (
            <TouchableOpacity key={c.key} style={[styles.chip, { flex: 1 }, condition === c.key && styles.chipActive]} onPress={() => setCondition(c.key)}>
              <Text style={[styles.chipText, condition === c.key && { color: '#1A0B33' }]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>SALE TYPE</Text>
        <View style={styles.chipRowFixed}>
          <TouchableOpacity style={[styles.chip, { flex: 1 }, listingType === 'FIXED' && styles.chipActive]} onPress={() => setListingType('FIXED')}>
            <Text style={[styles.chipText, listingType === 'FIXED' && { color: '#1A0B33' }]}>Fixed Price</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.chip, { flex: 1 }, listingType === 'AUCTION' && styles.chipActive]} onPress={() => setListingType('AUCTION')}>
            <Text style={[styles.chipText, listingType === 'AUCTION' && { color: '#1A0B33' }]}>Auction</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>{listingType === 'AUCTION' ? 'STARTING BID (MSH)' : 'PRICE (MSH)'}</Text>
        <TextInput style={styles.input} placeholder="e.g. 50" placeholderTextColor={COLORS.textMuted} value={price} onChangeText={setPrice} keyboardType="numeric" />

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

        <Text style={styles.label}>DESCRIPTION (OPTIONAL)</Text>
        <TextInput
          style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
          placeholder="Condition details, reason for selling, etc."
          placeholderTextColor={COLORS.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <TouchableOpacity style={[styles.saveBtn, !canSave && { opacity: 0.4 }]} disabled={!canSave || saving} onPress={save}>
          {saving ? <ActivityIndicator color="#FFF" /> : (
            <>
              <Ionicons name="checkmark" size={18} color="#FFF" />
              <Text style={styles.saveText}>{listingType === 'AUCTION' ? 'Start Auction' : 'Publish Listing'}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
