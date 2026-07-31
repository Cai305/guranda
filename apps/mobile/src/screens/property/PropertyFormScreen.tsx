import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../theme';
import { fetchApi, uploadImage } from '../../utils/api';

const MIN_PHOTOS = 5;

const KINDS = [
  { key: 'APARTMENT', label: '🏢 Apartment' },
  { key: 'HOUSE', label: '🏡 House' },
  { key: 'COMMERCIAL', label: '🏬 Commercial' },
];

export default function PropertyFormScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('APARTMENT');
  const [listingType, setListingType] = useState('RENT');
  const [price, setPrice] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [bedrooms, setBedrooms] = useState('2');
  const [bathrooms, setBathrooms] = useState('1');
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]); // uploaded URLs
  const [uploading, setUploading] = useState(false);

  const canSave = title.trim() && price.trim() && address.trim() && photos.length >= MIN_PHOTOS;

  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 10,
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

  const save = async () => {
    try {
      setSaving(true);
      const res = await fetchApi('/property', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          kind,
          listingType,
          price: parseFloat(price),
          address: address.trim(),
          description: description.trim() || undefined,
          bedrooms: parseInt(bedrooms) || 0,
          bathrooms: parseInt(bathrooms) || 0,
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
        <Text style={TYPOGRAPHY.h2}>List a Property</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.label}>
          PHOTOS ({photos.length}/{MIN_PHOTOS} minimum)
        </Text>
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
              <ActivityIndicator color="#2DD4BF" size="small" />
            ) : (
              <>
                <Ionicons name="camera" size={22} color="#2DD4BF" />
                <Text style={styles.photoAddText}>Add</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
        {photos.length < MIN_PHOTOS && (
          <Text style={styles.photoHint}>
            Every listing needs at least {MIN_PHOTOS} pictures — add {MIN_PHOTOS - photos.length} more.
          </Text>
        )}

        <Text style={styles.label}>TITLE</Text>
        <TextInput style={styles.input} placeholder="e.g. Sunny 2-bed near the park" placeholderTextColor={COLORS.textMuted} value={title} onChangeText={setTitle} />

        <Text style={styles.label}>TYPE</Text>
        <View style={styles.chipRow}>
          {KINDS.map(k => (
            <TouchableOpacity key={k.key} style={[styles.chip, kind === k.key && styles.chipActive]} onPress={() => setKind(k.key)}>
              <Text style={[styles.chipText, kind === k.key && { color: '#04291B' }]}>{k.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>LISTING</Text>
        <View style={styles.chipRow}>
          {['RENT', 'SALE'].map(t => (
            <TouchableOpacity key={t} style={[styles.chip, listingType === t && styles.chipActive]} onPress={() => setListingType(t)}>
              <Text style={[styles.chipText, listingType === t && { color: '#04291B' }]}>
                {t === 'RENT' ? 'To Rent' : 'For Sale'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>{listingType === 'RENT' ? 'MONTHLY RENT (MSH)' : 'PRICE (MSH)'}</Text>
        <TextInput style={styles.input} placeholder="e.g. 45" placeholderTextColor={COLORS.textMuted} value={price} onChangeText={setPrice} keyboardType="numeric" />

        <Text style={styles.label}>ADDRESS</Text>
        <TextInput style={styles.input} placeholder="Street, suburb, city" placeholderTextColor={COLORS.textMuted} value={address} onChangeText={setAddress} />

        {kind !== 'COMMERCIAL' && (
          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>BEDROOMS</Text>
              <TextInput style={styles.input} value={bedrooms} onChangeText={setBedrooms} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>BATHROOMS</Text>
              <TextInput style={styles.input} value={bathrooms} onChangeText={setBathrooms} keyboardType="numeric" />
            </View>
          </View>
        )}

        <Text style={styles.label}>DESCRIPTION (OPTIONAL)</Text>
        <TextInput
          style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
          placeholder="What makes this place special?"
          placeholderTextColor={COLORS.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <TouchableOpacity style={[styles.saveBtn, !canSave && { opacity: 0.4 }]} disabled={!canSave || saving} onPress={save}>
          {saving ? <ActivityIndicator color="#FFF" /> : (
            <>
              <Ionicons name="checkmark" size={18} color="#FFF" />
              <Text style={styles.saveText}>Publish Listing</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.footnote}>Publishing makes you the agent for this property.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07211E' },
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
    borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.glassBorder,
    color: COLORS.text,
    padding: 13, fontSize: 14,
  },
  chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: SPACING.lg },
  chip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.pill,
    borderWidth: 1, borderColor: COLORS.glassBorder,
    paddingVertical: 10,
    alignItems: 'center',
  },
  chipActive: { backgroundColor: '#2DD4BF', borderColor: '#2DD4BF' },
  chipText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 12.5 },
  photoRow: { paddingHorizontal: SPACING.lg, gap: 10 },
  photoWrap: { position: 'relative' },
  photo: {
    width: 84, height: 84, borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  photoRemove: {
    position: 'absolute', top: -6, right: -6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#DC2626',
    justifyContent: 'center', alignItems: 'center',
  },
  photoAdd: {
    width: 84, height: 84, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: 'rgba(45,212,191,0.6)', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', gap: 4,
  },
  photoAddText: { color: '#2DD4BF', fontSize: 11, fontWeight: '700' },
  photoHint: {
    color: '#F59E0B', fontSize: 11.5,
    paddingHorizontal: SPACING.lg, marginTop: 8,
  },
  twoCol: { flexDirection: 'row', gap: 10, paddingRight: 0 },
  saveBtn: {
    flexDirection: 'row', gap: 8,
    margin: SPACING.lg, marginTop: SPACING.xl,
    backgroundColor: '#0D9488',
    borderRadius: RADIUS.pill,
    paddingVertical: 15,
    justifyContent: 'center', alignItems: 'center',
  },
  saveText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  footnote: { color: COLORS.textMuted, fontSize: 11, textAlign: 'center' },
});
