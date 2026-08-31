import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { fetchApi, uploadImage } from '../../../utils/api';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../theme/useThemedStyles';

const CAR_CATEGORIES = ['Economy', 'SUV', 'Luxury', 'Van', 'Convertible'];

export default function AddEditTravelCarScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const existing = route.params?.car;
  const isEdit = !!existing;

  const [make, setMake] = useState(existing?.make || '');
  const [model, setModel] = useState(existing?.model || '');
  const [category, setCategory] = useState(existing?.category || 'Economy');
  const [location, setLocation] = useState(existing?.location || '');
  const [pricePerDay, setPricePerDay] = useState(existing?.pricePerDay?.toString() || '');
  const [imageUri, setImageUri] = useState<string | null>(existing?.imageUrl || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
    if (!make.trim() || !model.trim() || !location.trim() || !pricePerDay.trim()) {
      setError('Make, model, location and daily price are required');
      return;
    }
    const parsedPrice = parseFloat(pricePerDay);
    if (isNaN(parsedPrice) || parsedPrice <= 0) { setError('Enter a valid daily price'); return; }
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
        make: make.trim(),
        model: model.trim(),
        category,
        location: location.trim(),
        pricePerDay: parsedPrice,
        ...(imageUrl ? { imageUrl } : {}),
      };
      const res = isEdit
        ? await fetchApi(`/travel/cars/${existing.id}`, { method: 'PUT', body: JSON.stringify(body) })
        : await fetchApi('/travel/cars', { method: 'POST', body: JSON.stringify(body) });
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
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Car' : 'List a Car'}</Text>
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

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Make *</Text>
            <TextInput style={styles.input} placeholder="Toyota" placeholderTextColor={COLORS.textMuted} value={make} onChangeText={setMake} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Model *</Text>
            <TextInput style={styles.input} placeholder="Corolla" placeholderTextColor={COLORS.textMuted} value={model} onChangeText={setModel} />
          </View>
        </View>

        <View>
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {CAR_CATEGORIES.map(cat => (
              <TouchableOpacity key={cat} style={[styles.chip, category === cat && styles.chipActive]} onPress={() => setCategory(cat)}>
                <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View>
          <Text style={styles.label}>Location *</Text>
          <TextInput style={styles.input} placeholder="e.g. Cape Town" placeholderTextColor={COLORS.textMuted} value={location} onChangeText={setLocation} />
        </View>

        <View>
          <Text style={styles.label}>Price/day (MSH) *</Text>
          <TextInput style={styles.input} placeholder="0.00" placeholderTextColor={COLORS.textMuted} value={pricePerDay} onChangeText={setPricePerDay} keyboardType="decimal-pad" />
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
            <Text style={styles.saveBtnText}>{isEdit ? 'Save Changes' : 'List Car'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
