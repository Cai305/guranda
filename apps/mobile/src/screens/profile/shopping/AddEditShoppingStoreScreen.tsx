import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { fetchApi, uploadImage } from '../../../utils/api';

const CATEGORIES = ['Fashion', 'Electronics', 'Home & Garden', 'Beauty', 'Sports', 'Toys', 'Books', 'Other'];

export default function AddEditShoppingStoreScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const insets = useSafeAreaInsets();
  const existing = route.params?.store;
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.name || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [category, setCategory] = useState(existing?.category || 'Fashion');
  const [coverUri, setCoverUri] = useState<string | null>(existing?.coverUrl || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setCoverUri(result.assets[0].uri);
    }
  };

  const save = async () => {
    if (!name.trim()) {
      setError('Store name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      let coverUrl = existing?.coverUrl || null;
      if (coverUri && coverUri !== existing?.coverUrl) {
        setUploading(true);
        coverUrl = await uploadImage(coverUri);
        setUploading(false);
      }

      const body = {
        name: name.trim(),
        description: description.trim(),
        category,
        ...(coverUrl ? { coverUrl } : {}),
      };
      const res = isEdit
        ? await fetchApi(`/shopping/stores/${existing.id}`, { method: 'PUT', body: JSON.stringify(body) })
        : await fetchApi('/shopping/stores', { method: 'POST', body: JSON.stringify(body) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to save');
      }
      navigation.navigate('MyShoppingStore');
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4, marginRight: 8 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1 },
    label: { color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 8 },
    optional: { color: COLORS.textMuted, fontWeight: '400' },
    coverPicker: {
      height: 160, borderRadius: 14, overflow: 'hidden', borderWidth: 1.5,
      borderColor: COLORS.border, borderStyle: 'dashed', backgroundColor: COLORS.surface,
    },
    coverPreview: { width: '100%', height: '100%' },
    coverPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
    coverPlaceholderText: { color: COLORS.textMuted, fontSize: 13 },
    coverEditBadge: {
      position: 'absolute', bottom: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    },
    coverEditText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    input: {
      backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
      padding: 14, color: COLORS.text, fontSize: 14,
    },
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    catChip: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
      backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    },
    catChipActive: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
    catChipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
    catChipTextActive: { color: '#fff' },
    infoCard: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#8B5CF615',
      borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#8B5CF630',
    },
    infoText: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18, flex: 1 },
    errorText: { color: '#ef4444', fontSize: 13 },
    // paddingBottom set dynamically via insets in JSX — a flat SPACING.lg
    // leaves the button flush against the home indicator / gesture bar on
    // notched devices with no clearance from it.
    footer: {
      position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg,
      backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border,
    },
    saveBtn: { backgroundColor: '#8B5CF6', borderRadius: 14, padding: 16, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Store' : 'Create Store'}</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 20, paddingBottom: 100 }}>
        <View>
          <Text style={styles.label}>Store Cover Photo <Text style={styles.optional}>(optional)</Text></Text>
          <TouchableOpacity style={styles.coverPicker} onPress={pickImage} activeOpacity={0.8}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.coverPreview} resizeMode="cover" />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons name="camera-outline" size={32} color={COLORS.textMuted} />
                <Text style={styles.coverPlaceholderText}>Tap to add a cover photo</Text>
              </View>
            )}
            {coverUri && (
              <View style={styles.coverEditBadge}>
                <Ionicons name="camera" size={14} color="#fff" />
                <Text style={styles.coverEditText}>Change</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View>
          <Text style={styles.label}>Store Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Urban Threads"
            placeholderTextColor={COLORS.textMuted}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View>
          <Text style={styles.label}>Category *</Text>
          <View style={styles.catGrid}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.catChip, category === cat && styles.catChipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.catChipText, category === cat && styles.catChipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View>
          <Text style={styles.label}>Description <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={[styles.input, { minHeight: 80 }]}
            placeholder="Tell customers what makes your store special…"
            placeholderTextColor={COLORS.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={18} color="#8B5CF6" />
          <Text style={styles.infoText}>Customers pay with their Guranda Wallet (MSH) and earn 3% cashback on every order — no fees to you.</Text>
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
            <Text style={styles.saveBtnText}>{isEdit ? 'Save Changes' : 'Create Store'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
