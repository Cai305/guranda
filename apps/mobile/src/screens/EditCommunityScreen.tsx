import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi, uploadMedia } from '../utils/api';
import { invalidateCachedResponse } from '../utils/apiCache';

const CATEGORIES = ['Gaming', 'Music', 'Sports', 'Tech', 'Business', 'Lifestyle', 'Education', 'Other'];

export default function EditCommunityScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const { communityId } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchApi(`/communities/${communityId}`, { headers: { 'Cache-Control': 'no-cache' } });
        if (res.ok) {
          const data = await res.json();
          setName(data.name || '');
          setDescription(data.description || '');
          setCategory(data.category || null);
          setPrivacy(data.privacy || 'PUBLIC');
          setIconUrl(data.iconUrl || null);
          setCoverUrl(data.coverUrl || null);
        }
      } catch {}
      setLoading(false);
    })();
  }, [communityId]);

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    closeBtn: { padding: 5 },
    saveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { ...TYPOGRAPHY.body2, color: COLORS.surface, fontWeight: 'bold' },
    form: { padding: 20 },
    label: { ...TYPOGRAPHY.body2, color: COLORS.textMuted, marginBottom: 8, marginTop: 16 },
    input: {
      backgroundColor: COLORS.surface, color: COLORS.text, paddingHorizontal: 15, paddingVertical: 12,
      borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, fontSize: 16,
    },
    textArea: { minHeight: 100 },
    coverWrap: {
      height: 120, borderRadius: 16, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
      overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    },
    coverImage: { width: '100%', height: '100%' },
    iconRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    iconCircle: {
      width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    iconImage: { width: 64, height: 64 },
    pickBtnText: { color: COLORS.primary, fontWeight: '600' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipText: { color: COLORS.textMuted, fontWeight: '600', fontSize: 13 },
    chipTextActive: { color: '#fff' },
    privacyRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
    privacyOption: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, gap: 4 },
    privacyOptionActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}15` },
    privacyTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    privacyDesc: { color: COLORS.textMuted, fontSize: 12 },
    dangerZone: { marginTop: 32, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 20 },
    deleteBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      borderWidth: 1, borderColor: COLORS.error, borderRadius: 12, paddingVertical: 14,
    },
    deleteBtnText: { color: COLORS.error, fontWeight: '700' },
  }));

  const pickIcon = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled) return;
    try {
      setUploadingIcon(true);
      const uploaded = await uploadMedia(result.assets[0].uri, 'image');
      setIconUrl(uploaded.url);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message || 'Could not upload that image.');
    } finally {
      setUploadingIcon(false);
    }
  };

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.8 });
    if (result.canceled) return;
    try {
      setUploadingCover(true);
      const uploaded = await uploadMedia(result.assets[0].uri, 'image');
      setCoverUrl(uploaded.url);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message || 'Could not upload that image.');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      setSaving(true);
      const res = await fetchApi(`/communities/${communityId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          iconUrl: iconUrl || undefined,
          coverUrl: coverUrl || undefined,
          category: category || undefined,
          privacy,
        }),
      });
      if (res.ok) {
        await invalidateCachedResponse(`/communities/${communityId}`);
        await invalidateCachedResponse('/communities');
        navigation.goBack();
      } else {
        const data = await res.json().catch(() => null);
        Alert.alert('Error', data?.message || "Couldn't save changes.");
      }
    } catch {
      Alert.alert('Error', 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete community',
      'This permanently deletes the community, its channels, posts and messages. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const res = await fetchApi(`/communities/${communityId}`, { method: 'DELETE' });
            setDeleting(false);
            if (res.ok) {
              await invalidateCachedResponse('/communities');
              await invalidateCachedResponse('/communities/my');
              navigation.navigate('Main');
            } else {
              Alert.alert('Error', (await res.json().catch(() => null))?.message || "Couldn't delete the community.");
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={TYPOGRAPHY.h3}>Edit Community</Text>
          <TouchableOpacity
            style={[styles.saveBtn, (!name.trim() || saving) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!name.trim() || saving}
          >
            {saving ? <ActivityIndicator color={COLORS.surface} size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.form}>
          <Text style={styles.label}>Cover photo</Text>
          <TouchableOpacity style={styles.coverWrap} onPress={pickCover} disabled={uploadingCover}>
            {uploadingCover ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : coverUrl ? (
              <Image source={{ uri: coverUrl }} style={styles.coverImage} resizeMode="cover" />
            ) : (
              <>
                <Ionicons name="image-outline" size={26} color={COLORS.textMuted} />
                <Text style={styles.pickBtnText}>Add a cover photo</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Icon</Text>
          <View style={styles.iconRow}>
            <TouchableOpacity style={styles.iconCircle} onPress={pickIcon} disabled={uploadingIcon}>
              {uploadingIcon ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : iconUrl ? (
                <Image source={{ uri: iconUrl }} style={styles.iconImage} />
              ) : (
                <Ionicons name="earth" size={28} color={COLORS.textMuted} />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={pickIcon} disabled={uploadingIcon}>
              <Text style={styles.pickBtnText}>{iconUrl ? 'Change icon' : 'Add an icon'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Community Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor={COLORS.textMuted} />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(category === c ? null : c)}>
                <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Privacy</Text>
          <View style={styles.privacyRow}>
            <TouchableOpacity style={[styles.privacyOption, privacy === 'PUBLIC' && styles.privacyOptionActive]} onPress={() => setPrivacy('PUBLIC')}>
              <Ionicons name="earth" size={18} color={privacy === 'PUBLIC' ? COLORS.primary : COLORS.textMuted} />
              <Text style={styles.privacyTitle}>Public</Text>
              <Text style={styles.privacyDesc}>Anyone can find and join</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.privacyOption, privacy === 'PRIVATE' && styles.privacyOptionActive]} onPress={() => setPrivacy('PRIVATE')}>
              <Ionicons name="lock-closed" size={18} color={privacy === 'PRIVATE' ? COLORS.primary : COLORS.textMuted} />
              <Text style={styles.privacyTitle}>Private</Text>
              <Text style={styles.privacyDesc}>Invite-only, hidden from browse</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dangerZone}>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={deleting}>
              {deleting ? <ActivityIndicator color={COLORS.error} size="small" /> : (
                <>
                  <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                  <Text style={styles.deleteBtnText}>Delete Community</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
