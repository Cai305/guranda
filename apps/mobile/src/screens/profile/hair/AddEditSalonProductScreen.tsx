import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, Switch } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { fetchApi, uploadMedia } from '../../../utils/api';

export default function AddEditSalonProductScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const insets = useSafeAreaInsets();
  const existing = route.params?.product;
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.name || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [price, setPrice] = useState(existing?.price?.toString() || '');
  const [imageUrl, setImageUrl] = useState<string | null>(existing?.imageUrl ?? null);
  const [inStock, setInStock] = useState(existing?.inStock ?? true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const styles = useThemedStyles(({ COLORS, SPACING, TYPOGRAPHY, RADIUS }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    label: { color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 8 },
    optional: { color: COLORS.textMuted, fontWeight: '400' },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14, color: COLORS.text, fontSize: 14 },
    imagePicker: {
      width: 100, height: 100, borderRadius: RADIUS.md, backgroundColor: COLORS.surface,
      borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    imagePreview: { width: '100%', height: '100%' },
    stockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    errorText: { color: '#ef4444', fontSize: 13 },
    // paddingBottom set dynamically via insets in JSX — a flat SPACING.lg
    // leaves the button flush against the home indicator / gesture bar on
    // notched devices with no clearance from it.
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
    saveBtn: { backgroundColor: '#38BDF8', borderRadius: 14, padding: 16, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  }));

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;
    setUploading(true);
    try {
      const { url } = await uploadMedia(result.assets[0].uri, 'image');
      setImageUrl(url);
    } catch {
      setError('Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) { setError('Enter a valid price'); return; }
    setSaving(true);
    setError('');
    try {
      const body = { name: name.trim(), description: description.trim() || undefined, price: parsedPrice, imageUrl: imageUrl ?? undefined, inStock };
      const res = isEdit
        ? await fetchApi(`/hair/mine/products/${existing.id}`, { method: 'PATCH', body: JSON.stringify(body) })
        : await fetchApi('/hair/mine/products', { method: 'POST', body: JSON.stringify(body) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to save');
      }
      navigation.goBack();
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Product' : 'Add Product'}</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 20, paddingBottom: 100 }}>
        <View>
          <Text style={styles.label}>Photo <Text style={styles.optional}>(optional)</Text></Text>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.imagePreview} />
            ) : (
              <Ionicons name="camera-outline" size={28} color={COLORS.textMuted} />
            )}
          </TouchableOpacity>
        </View>
        <View>
          <Text style={styles.label}>Name *</Text>
          <TextInput style={styles.input} placeholder="e.g. X-Pression Ultra Braid" placeholderTextColor={COLORS.textMuted} value={name} onChangeText={setName} />
        </View>
        <View>
          <Text style={styles.label}>Price (MSH) *</Text>
          <TextInput style={styles.input} placeholder="0.00" placeholderTextColor={COLORS.textMuted} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
        </View>
        <View>
          <Text style={styles.label}>Description <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput style={[styles.input, { minHeight: 70 }]} placeholder="Details about this product…" placeholderTextColor={COLORS.textMuted} value={description} onChangeText={setDescription} multiline />
        </View>
        <View style={styles.stockRow}>
          <Text style={styles.label}>In stock</Text>
          <Switch value={inStock} onValueChange={setInStock} trackColor={{ true: COLORS.primary }} />
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.lg }]}>
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{isEdit ? 'Save Changes' : 'Add Product'}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
