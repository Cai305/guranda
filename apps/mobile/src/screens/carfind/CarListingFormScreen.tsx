import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi, uploadImage } from '../../utils/api';

const MIN_PHOTOS = 3;

const TRANSMISSIONS = [
  { key: 'MANUAL', label: 'Manual' },
  { key: 'AUTOMATIC', label: 'Automatic' },
];
const FUEL_TYPES = [
  { key: 'PETROL', label: 'Petrol' },
  { key: 'DIESEL', label: 'Diesel' },
  { key: 'HYBRID', label: 'Hybrid' },
  { key: 'ELECTRIC', label: 'Electric' },
];
const BODY_TYPES = [
  { key: 'HATCHBACK', label: '🚗 Hatchback' },
  { key: 'SEDAN', label: '🚘 Sedan' },
  { key: 'SUV', label: '🚙 SUV' },
  { key: 'BAKKIE', label: '🛻 Bakkie' },
  { key: 'COUPE', label: '🏎️ Coupe' },
  { key: 'VAN', label: '🚐 Van' },
];
const CONDITIONS = [
  { key: 'USED', label: 'Used' },
  { key: 'NEW', label: 'New' },
];

export default function CarListingFormScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const [title, setTitle] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [price, setPrice] = useState('');
  const [mileage, setMileage] = useState('');
  const [transmission, setTransmission] = useState('MANUAL');
  const [fuelType, setFuelType] = useState('PETROL');
  const [bodyType, setBodyType] = useState('HATCHBACK');
  const [condition, setCondition] = useState('USED');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING, TYPOGRAPHY }) => ({
    root: { flex: 1, backgroundColor: '#160B2E' },
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
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: SPACING.lg },
    chip: {
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderRadius: RADIUS.pill,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      paddingVertical: 10, paddingHorizontal: 14,
      alignItems: 'center',
    },
    chipActive: { backgroundColor: '#A78BFA', borderColor: '#A78BFA' },
    chipText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 12.5 },
    photoRow: { paddingHorizontal: SPACING.lg, gap: 10 },
    photoWrap: { position: 'relative' },
    photo: { width: 84, height: 84, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.06)' },
    photoRemove: {
      position: 'absolute', top: -6, right: -6,
      width: 20, height: 20, borderRadius: 10,
      backgroundColor: '#DC2626',
      justifyContent: 'center', alignItems: 'center',
    },
    photoAdd: {
      width: 84, height: 84, borderRadius: RADIUS.md,
      borderWidth: 1.5, borderColor: 'rgba(167,139,250,0.6)', borderStyle: 'dashed',
      justifyContent: 'center', alignItems: 'center', gap: 4,
    },
    photoAddText: { color: '#A78BFA', fontSize: 11, fontWeight: '700' },
    photoHint: { color: '#F59E0B', fontSize: 11.5, paddingHorizontal: SPACING.lg, marginTop: 8 },
    twoCol: { flexDirection: 'row', gap: 10, paddingHorizontal: 0 },
    saveBtn: {
      flexDirection: 'row', gap: 8,
      margin: SPACING.lg, marginTop: SPACING.xl,
      backgroundColor: '#7C3AED',
      borderRadius: RADIUS.pill,
      paddingVertical: 15,
      justifyContent: 'center', alignItems: 'center',
    },
    saveText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  }));

  const canSave = title.trim() && make.trim() && model.trim() && price.trim() && location.trim() && photos.length >= MIN_PHOTOS;

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
      const res = await fetchApi('/carfind/listings', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          make: make.trim(),
          model: model.trim(),
          year: parseInt(year) || new Date().getFullYear(),
          price: parseFloat(price),
          mileage: parseInt(mileage) || 0,
          transmission,
          fuelType,
          bodyType,
          condition,
          location: location.trim(),
          description: description.trim() || undefined,
          images: photos,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Could not publish listing');
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
        <Text style={TYPOGRAPHY.h2}>List a Car</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.label}>PHOTOS ({photos.length}/{MIN_PHOTOS} minimum)</Text>
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
        {photos.length < MIN_PHOTOS && (
          <Text style={styles.photoHint}>
            Every listing needs at least {MIN_PHOTOS} pictures — add {MIN_PHOTOS - photos.length} more.
          </Text>
        )}

        <Text style={styles.label}>TITLE</Text>
        <TextInput style={styles.input} placeholder="e.g. 2020 Volkswagen Polo TSI Comfortline" placeholderTextColor={COLORS.textMuted} value={title} onChangeText={setTitle} />

        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>MAKE</Text>
            <TextInput style={styles.input} placeholder="Volkswagen" placeholderTextColor={COLORS.textMuted} value={make} onChangeText={setMake} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>MODEL</Text>
            <TextInput style={styles.input} placeholder="Polo" placeholderTextColor={COLORS.textMuted} value={model} onChangeText={setModel} />
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>YEAR</Text>
            <TextInput style={styles.input} value={year} onChangeText={setYear} keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>MILEAGE (KM)</Text>
            <TextInput style={styles.input} placeholder="42000" placeholderTextColor={COLORS.textMuted} value={mileage} onChangeText={setMileage} keyboardType="numeric" />
          </View>
        </View>

        <Text style={styles.label}>PRICE (MSH)</Text>
        <TextInput style={styles.input} placeholder="e.g. 245000" placeholderTextColor={COLORS.textMuted} value={price} onChangeText={setPrice} keyboardType="numeric" />

        <Text style={styles.label}>LOCATION</Text>
        <TextInput style={styles.input} placeholder="City or suburb" placeholderTextColor={COLORS.textMuted} value={location} onChangeText={setLocation} />

        <Text style={styles.label}>BODY TYPE</Text>
        <View style={styles.chipWrap}>
          {BODY_TYPES.map(b => (
            <TouchableOpacity key={b.key} style={[styles.chip, bodyType === b.key && styles.chipActive]} onPress={() => setBodyType(b.key)}>
              <Text style={[styles.chipText, bodyType === b.key && { color: '#1E0A3C' }]}>{b.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>TRANSMISSION</Text>
        <View style={styles.chipRow}>
          {TRANSMISSIONS.map(t => (
            <TouchableOpacity key={t.key} style={[styles.chip, { flex: 1 }, transmission === t.key && styles.chipActive]} onPress={() => setTransmission(t.key)}>
              <Text style={[styles.chipText, transmission === t.key && { color: '#1E0A3C' }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>FUEL TYPE</Text>
        <View style={styles.chipWrap}>
          {FUEL_TYPES.map(f => (
            <TouchableOpacity key={f.key} style={[styles.chip, fuelType === f.key && styles.chipActive]} onPress={() => setFuelType(f.key)}>
              <Text style={[styles.chipText, fuelType === f.key && { color: '#1E0A3C' }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>CONDITION</Text>
        <View style={styles.chipRow}>
          {CONDITIONS.map(c => (
            <TouchableOpacity key={c.key} style={[styles.chip, { flex: 1 }, condition === c.key && styles.chipActive]} onPress={() => setCondition(c.key)}>
              <Text style={[styles.chipText, condition === c.key && { color: '#1E0A3C' }]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>DESCRIPTION (OPTIONAL)</Text>
        <TextInput
          style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
          placeholder="Service history, extras, condition notes…"
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
      </ScrollView>
    </SafeAreaView>
  );
}
