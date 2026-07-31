import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, TYPOGRAPHY, SPACING } from '../../../theme';
import { fetchApi, uploadImage } from '../../../utils/api';

const PRODUCT_CATS = ['Tops', 'Bottoms', 'Footwear', 'Accessories', 'Gadgets', 'Home', 'Other'];

export default function AddEditShoppingProductScreen({ navigation, route }: any) {
  const { storeId, product: existing } = route.params;
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.name || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [price, setPrice] = useState(existing?.price?.toString() || '');
  const [category, setCategory] = useState(existing?.category || 'Tops');
  const [imageUri, setImageUri] = useState<string | null>(existing?.imageUrl || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const save = async () => {
    if (!name.trim() || !price.trim()) {
      setError('Name and price are required');
      return;
    }
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setError('Enter a valid price');
      return;
    }
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
        name: name.trim(),
        description: description.trim(),
        price: parsedPrice,
        category,
        ...(imageUrl ? { imageUrl } : {}),
      };
      const res = isEdit
        ? await fetchApi(`/shopping/stores/${storeId}/products/${existing.id}`, { method: 'PUT', body: JSON.stringify(body) })
        : await fetchApi(`/shopping/stores/${storeId}/products`, { method: 'POST', body: JSON.stringify(body) });
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
            <View style={styles.cameraBtn}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        <View>
          <Text style={styles.label}>Product Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Graphic Tee"
            placeholderTextColor={COLORS.textMuted}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View>
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {PRODUCT_CATS.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.catChip, category === cat && styles.catChipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.catChipText, category === cat && styles.catChipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View>
          <Text style={styles.label}>Price (MSH) *</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor={COLORS.textMuted}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
          />
        </View>

        <View>
          <Text style={styles.label}>Description <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={[styles.input, { minHeight: 80 }]}
            placeholder="Describe this product…"
            placeholderTextColor={COLORS.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving || uploading}>
          {saving || uploading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.saveBtnText}>{uploading ? 'Uploading…' : 'Saving…'}</Text>
            </View>
          ) : (
            <Text style={styles.saveBtnText}>{isEdit ? 'Save Changes' : 'Add Product'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
  back: { padding: 4, marginRight: 8 },
  headerTitle: { ...TYPOGRAPHY.h2, flex: 1 },
  label: { color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  optional: { color: COLORS.textMuted, fontWeight: '400' },
  imagePicker: {
    width: 120, height: 120, borderRadius: 20, overflow: 'hidden', backgroundColor: COLORS.surface,
    borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  imagePreview: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 6 },
  imagePlaceholderText: { color: COLORS.textMuted, fontSize: 12 },
  cameraBtn: {
    position: 'absolute', bottom: 6, right: 6, width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center',
  },
  input: {
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    padding: 14, color: COLORS.text, fontSize: 14,
  },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  catChipActive: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  catChipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  catChipTextActive: { color: '#fff' },
  errorText: { color: '#ef4444', fontSize: 13 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg,
    backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  saveBtn: { backgroundColor: '#8B5CF6', borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
