import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { fetchApi, uploadImage } from '../../../utils/api';

const AMENITY_OPTIONS = ['WiFi', 'Pool', 'Parking', 'Kitchen', 'Air Conditioning', 'Braai', 'Sea View', 'Pet Friendly'];

export default function AddEditTravelStayScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const existing = route.params?.stay;
  const isEdit = !!existing;

  const [title, setTitle] = useState(existing?.title || '');
  const [location, setLocation] = useState(existing?.location || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [pricePerNight, setPricePerNight] = useState(existing?.pricePerNight?.toString() || '');
  const [maxGuests, setMaxGuests] = useState(existing?.maxGuests?.toString() || '2');
  const [amenities, setAmenities] = useState<string[]>(existing?.amenities || []);
  const [imageUri, setImageUri] = useState<string | null>(existing?.imageUrl || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleAmenity = (a: string) => {
    setAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const save = async () => {
    if (!title.trim() || !location.trim() || !pricePerNight.trim()) {
      setError('Title, location and nightly price are required');
      return;
    }
    const parsedPrice = parseFloat(pricePerNight);
    if (isNaN(parsedPrice) || parsedPrice <= 0) { setError('Enter a valid nightly price'); return; }
    setSaving(true);
    setError('');
    try {
      let imageUrl = existing?.imageUrl || null;
      if (imageUri && imageUri !== existing?.imageUrl) {
        setUploading(true);
        imageUrl = await uploadImage(imageUri);
        setUploading(false);
      }
      const body = {
        title: title.trim(),
        location: location.trim(),
        description: description.trim(),
        pricePerNight: parsedPrice,
        maxGuests: Number(maxGuests) || 2,
        amenities,
        ...(imageUrl ? { imageUrl } : {}),
      };
      const res = isEdit
        ? await fetchApi(`/travel/stays/${existing.id}`, { method: 'PUT', body: JSON.stringify(body) })
        : await fetchApi('/travel/stays', { method: 'POST', body: JSON.stringify(body) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to save');
      }
      navigation.goBack();
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const styles = useThemedStyles(({ COLORS, SPACING, TYPOGRAPHY }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    label: { color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 8 },
    optional: { color: COLORS.textMuted, fontWeight: '400' },
    imagePicker: {
      width: 140, height: 105, borderRadius: 16, overflow: 'hidden', backgroundColor: COLORS.surface,
      borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed',
    },
    imagePreview: { width: '100%', height: '100%' },
    imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 6 },
    imagePlaceholderText: { color: COLORS.textMuted, fontSize: 12 },
    cameraBtn: { position: 'absolute', bottom: 6, right: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center' },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14, color: COLORS.text, fontSize: 14 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    chipActive: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
    chipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
    chipTextActive: { color: '#fff' },
    errorText: { color: '#ef4444', fontSize: 13 },
    // paddingBottom set dynamically via insets in JSX — a flat SPACING.lg
    // leaves the button flush against the home indicator / gesture bar on
    // notched devices with no clearance from it.
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
    saveBtn: { backgroundColor: '#8B5CF6', borderRadius: 14, padding: 16, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Stay' : 'List a Stay'}</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 20, paddingBottom: 100 }}>
        <View style={{ alignItems: 'center' }}>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.8}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={36} color={COLORS.textMuted} />
                <Text style={styles.imagePlaceholderText}>Add photo</Text>
              </View>
            )}
            <View style={styles.cameraBtn}><Ionicons name="camera" size={16} color="#fff" /></View>
          </TouchableOpacity>
        </View>

        <View>
          <Text style={styles.label}>Title *</Text>
          <TextInput style={styles.input} placeholder="e.g. Camps Bay Beach House" placeholderTextColor={COLORS.textMuted} value={title} onChangeText={setTitle} />
        </View>

        <View>
          <Text style={styles.label}>Location *</Text>
          <TextInput style={styles.input} placeholder="e.g. Cape Town" placeholderTextColor={COLORS.textMuted} value={location} onChangeText={setLocation} />
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Price/night (MSH) *</Text>
            <TextInput style={styles.input} placeholder="0.00" placeholderTextColor={COLORS.textMuted} value={pricePerNight} onChangeText={setPricePerNight} keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Max guests</Text>
            <TextInput style={styles.input} placeholder="2" placeholderTextColor={COLORS.textMuted} value={maxGuests} onChangeText={setMaxGuests} keyboardType="number-pad" />
          </View>
        </View>

        <View>
          <Text style={styles.label}>Amenities</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {AMENITY_OPTIONS.map(a => (
              <TouchableOpacity key={a} style={[styles.chip, amenities.includes(a) && styles.chipActive]} onPress={() => toggleAmenity(a)}>
                <Text style={[styles.chipText, amenities.includes(a) && styles.chipTextActive]}>{a}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View>
          <Text style={styles.label}>Description <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Describe this stay…" placeholderTextColor={COLORS.textMuted} value={description} onChangeText={setDescription} multiline />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.lg }]}>
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving || uploading}>
          {saving || uploading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.saveBtnText}>{uploading ? 'Uploading…' : 'Saving…'}</Text>
            </View>
          ) : (
            <Text style={styles.saveBtnText}>{isEdit ? 'Save Changes' : 'List Stay'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
