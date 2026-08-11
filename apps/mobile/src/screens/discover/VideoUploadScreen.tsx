import React, { useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { API_BASE_URL, xhrUploadFormData } from '../../utils/api';
import { startUpload, updateUploadProgress, finishUpload, failUpload, notify } from '../../utils/uploadStatusStore';
import { generateVideoThumbnail } from '../../utils/videoThumbnail';

const CATEGORIES = ['Gaming', 'Music', 'Education', 'Cooking', 'Sports', 'Comedy', 'Technology', 'Fashion', 'Travel', 'Fitness', 'Art', 'Science', 'News', 'DIY', 'Finance'];
const MIN_DURATION_S = 45;

export default function VideoUploadScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [durationError, setDurationError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [generatingThumbnail, setGeneratingThumbnail] = useState(false);

  // Grabs a poster frame the moment a valid video is picked, well ahead of
  // the actual upload — so by the time the user taps "Upload" it's already
  // sitting in the form data (or the field is just quietly absent, if
  // extraction failed; a video posts fine without a thumbnail too).
  const generateThumbnailFor = async (uri: string) => {
    setThumbnailUrl(null);
    setGeneratingThumbnail(true);
    const url = await generateVideoThumbnail(uri);
    setThumbnailUrl(url);
    setGeneratingThumbnail(false);
  };

  const pickVideo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { notify('warning', 'Allow access to your media library.'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    // expo-image-picker reports `duration` in milliseconds on native, but on
    // web it comes straight from the HTML5 <video> element's `duration`
    // property, which is already in seconds — dividing by 1000 there turned
    // every real video into ~0 seconds and rejected it outright.
    const durationSec = asset.duration
      ? Math.floor(Platform.OS === 'web' ? asset.duration : asset.duration / 1000)
      : null;

    if (durationSec !== null && durationSec <= MIN_DURATION_S) {
      setDurationError(`Video must be longer than ${MIN_DURATION_S} seconds (yours is ${durationSec}s)`);
      setVideoUri(null);
      setVideoDuration(null);
      return;
    }

    setDurationError('');
    setVideoUri(asset.uri);
    setVideoDuration(durationSec);
    generateThumbnailFor(asset.uri);

    // On web: also verify duration via HTML5 video element
    if (Platform.OS === 'web') {
      checkDurationWeb(asset.uri);
    }
  };

  const checkDurationWeb = (uri: string) => {
    const vid = document.createElement('video');
    vid.preload = 'metadata';
    vid.onloadedmetadata = () => {
      const d = Math.floor(vid.duration);
      setVideoDuration(d);
      if (d <= MIN_DURATION_S) {
        setDurationError(`Video must be longer than ${MIN_DURATION_S} seconds (yours is ${d}s)`);
        setVideoUri(null);
      }
    };
    vid.src = uri;
  };

  const upload = async () => {
    if (!title.trim()) { notify('warning', 'Please enter a title'); return; }
    if (!category) { notify('warning', 'Please select a category'); return; }
    if (!videoUri) { notify('warning', 'Please pick a video'); return; }
    if (videoDuration !== null && videoDuration <= MIN_DURATION_S) {
      setDurationError(`Video must be longer than ${MIN_DURATION_S} seconds`);
      return;
    }

    setUploading(true);

    let token: string | null = null;
    if (Platform.OS === 'web') {
      try { token = localStorage.getItem('userToken'); } catch {}
    } else {
      const { default: SecureStore } = await import('expo-secure-store');
      token = await SecureStore.getItemAsync('userToken');
    }

    const form = new FormData();
    if (Platform.OS === 'web') {
      const blob = await fetch(videoUri).then(r => r.blob());
      form.append('file', blob, 'video.mp4');
    } else {
      (form as any).append('file', { uri: videoUri, name: 'video.mp4', type: 'video/mp4' });
    }
    form.append('title', title.trim());
    form.append('description', description.trim());
    form.append('category', category);
    form.append('tags', tags);
    form.append('duration', String(videoDuration ?? 60));
    if (thumbnailUrl) form.append('thumbnailUrl', thumbnailUrl);

    // xhrUploadFormData (not fetch) is what makes the real percentage in the
    // progress bar possible — fetch has no upload-progress event.
    const uploadId = startUpload('Uploading video…');
    try {
      await xhrUploadFormData(
        `${API_BASE_URL}/videos/upload`,
        form,
        token,
        (percent) => updateUploadProgress(uploadId, percent),
      );
      finishUpload(uploadId, 'Video uploaded successfully');
      navigation.navigate('Discovery');
    } catch (e: any) {
      // Stay on this screen on failure — the video (title, description,
      // category, tags) and the picked file are still right there so the
      // user can just retry instead of re-entering everything.
      failUpload(uploadId, e.message || 'Video upload failed');
    }
    setUploading(false);
  };

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    uploadBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
    uploadBtnDisabled: { opacity: 0.5 },
    uploadBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    content: { padding: SPACING.lg, gap: 20, paddingBottom: 60 },
    videoPicker: { borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed' },
    videoEmptyBox: { alignItems: 'center', paddingVertical: 48, gap: 8, backgroundColor: COLORS.surface },
    videoEmptyTitle: { ...TYPOGRAPHY.h3, color: COLORS.textMuted },
    videoEmptyHint: { color: COLORS.textMuted, fontSize: 12 },
    videoPickedBox: { alignItems: 'center', paddingVertical: 32, gap: 8, backgroundColor: '#22c55e10' },
    thumbnailPreview: { width: 120, height: 68, borderRadius: 8, backgroundColor: COLORS.surface },
    videoPickedText: { ...TYPOGRAPHY.body1, color: '#22c55e', fontWeight: '700' },
    videoDuration: { color: COLORS.textMuted, fontSize: 13 },
    rePickBtn: { marginTop: 4, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 14, backgroundColor: COLORS.surface },
    rePickText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
    durationError: { color: '#ef4444', fontSize: 13, fontWeight: '600', textAlign: 'center' },
    field: { gap: 8 },
    label: { ...TYPOGRAPHY.label, fontSize: 11 },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14, color: COLORS.text, fontSize: 14 },
    multiline: { minHeight: 100, textAlignVertical: 'top' },
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    catChipText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
    catChipTextActive: { color: '#fff' },
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Video</Text>
        <TouchableOpacity style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]} onPress={upload} disabled={uploading}>
          {uploading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.uploadBtnText}>Upload</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Video picker */}
        <TouchableOpacity style={styles.videoPicker} onPress={pickVideo}>
          {videoUri ? (
            <View style={styles.videoPickedBox}>
              {thumbnailUrl ? (
                <Image source={{ uri: thumbnailUrl }} style={styles.thumbnailPreview} />
              ) : generatingThumbnail ? (
                <ActivityIndicator color="#22c55e" />
              ) : (
                <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
              )}
              <Text style={styles.videoPickedText}>Video selected</Text>
              {videoDuration && <Text style={styles.videoDuration}>{Math.floor(videoDuration / 60)}:{String(videoDuration % 60).padStart(2, '0')}</Text>}
              <TouchableOpacity style={styles.rePickBtn} onPress={pickVideo}>
                <Text style={styles.rePickText}>Change video</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.videoEmptyBox}>
              <Ionicons name="cloud-upload-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.videoEmptyTitle}>Tap to select video</Text>
              <Text style={styles.videoEmptyHint}>Must be longer than 45 seconds</Text>
            </View>
          )}
        </TouchableOpacity>

        {durationError ? <Text style={styles.durationError}>{durationError}</Text> : null}

        {/* Title */}
        <View style={styles.field}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Give your video a title…"
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Tell viewers what this video is about…"
            placeholderTextColor={COLORS.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Category */}
        <View style={styles.field}>
          <Text style={styles.label}>Category *</Text>
          <View style={styles.catGrid}>
            {CATEGORIES.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.catChip, category === c && styles.catChipActive]}
                onPress={() => setCategory(c)}
              >
                <Text style={[styles.catChipText, category === c && styles.catChipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tags */}
        <View style={styles.field}>
          <Text style={styles.label}>Tags (comma-separated)</Text>
          <TextInput
            style={styles.input}
            placeholder="tutorial, beginner, tips…"
            placeholderTextColor={COLORS.textMuted}
            value={tags}
            onChangeText={setTags}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
