import React, { useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { API_BASE_URL, fetchApi, xhrUploadFormData } from '../../utils/api';
import { startUpload, updateUploadProgress, markUploadFinishing, finishUpload, failUpload, notify } from '../../utils/uploadStatusStore';
import { generateVideoThumbnail } from '../../utils/videoThumbnail';

const CATEGORIES = ['Gaming', 'Music', 'Education', 'Cooking', 'Sports', 'Comedy', 'Technology', 'Fashion', 'Travel', 'Fitness', 'Art', 'Science', 'News', 'DIY', 'Finance'];
const MIN_DURATION_S = 45;

const VIDEO_TYPES: { label: string; value: string }[] = [
  { label: 'Standard', value: 'STANDARD' },
  { label: 'Sponsored', value: 'SPONSORED' },
  { label: 'Promo', value: 'PROMO' },
  { label: 'Campaign', value: 'CAMPAIGN' },
  { label: 'Advert', value: 'ADVERT' },
  { label: 'Music', value: 'MUSIC' },
];

const PAYOUT_MODES: { label: string; value: string; unit: string }[] = [
  { label: 'Pay per full watch', value: 'COMPLETION', unit: 'watch' },
  { label: 'Pay per minute watched', value: 'PER_MINUTE', unit: 'minute' },
  { label: 'Pay for watch + subscribe', value: 'WATCH_AND_SUBSCRIBE', unit: 'watch' },
];

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
  const [videoType, setVideoType] = useState('STANDARD');

  // Optional reward-funding step — off by default, doesn't touch anything
  // else about the upload flow when left alone.
  const [rewardEnabled, setRewardEnabled] = useState(false);
  const [payoutMode, setPayoutMode] = useState('COMPLETION');
  const [amountPerUnit, setAmountPerUnit] = useState('');
  const [totalBudgetMsh, setTotalBudgetMsh] = useState('');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);

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

  // Fetches the creator's current balance the first time they open the
  // reward section, so the budget field can be validated against it without
  // making every upload pay for a wallet call it'll never use.
  const toggleReward = (next: boolean) => {
    setRewardEnabled(next);
    if (next && walletBalance === null && !walletLoading) {
      setWalletLoading(true);
      fetchApi('/wallets/me')
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => { if (ok) setWalletBalance(data.balanceMasheleni ?? 0); })
        .catch(() => {})
        .finally(() => setWalletLoading(false));
    }
  };

  const parsedAmountPerUnit = parseFloat(amountPerUnit);
  const parsedTotalBudget = parseFloat(totalBudgetMsh);
  const rewardValid =
    !rewardEnabled ||
    (Number.isFinite(parsedAmountPerUnit) && parsedAmountPerUnit > 0 &&
      Number.isFinite(parsedTotalBudget) && parsedTotalBudget > 0);
  const rewardExceedsBalance =
    rewardEnabled && walletBalance !== null &&
    Number.isFinite(parsedTotalBudget) && parsedTotalBudget > walletBalance;
  const selectedPayoutMode = PAYOUT_MODES.find(m => m.value === payoutMode) ?? PAYOUT_MODES[0];

  const upload = async () => {
    if (!title.trim()) { notify('warning', 'Please enter a title'); return; }
    if (!category) { notify('warning', 'Please select a category'); return; }
    if (!videoUri) { notify('warning', 'Please pick a video'); return; }
    if (videoDuration !== null && videoDuration <= MIN_DURATION_S) {
      setDurationError(`Video must be longer than ${MIN_DURATION_S} seconds`);
      return;
    }
    if (rewardEnabled) {
      if (!rewardValid) { notify('warning', 'Enter a valid MSH amount and total budget'); return; }
      if (rewardExceedsBalance) { notify('warning', `Your budget exceeds your wallet balance (${walletBalance} MSH)`); return; }
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
    form.append('videoType', videoType);
    if (thumbnailUrl) form.append('thumbnailUrl', thumbnailUrl);

    // xhrUploadFormData (not fetch) is what makes the real percentage in the
    // progress bar possible — fetch has no upload-progress event.
    const uploadId = startUpload('Uploading video…');
    try {
      const uploadedVideo = await xhrUploadFormData(
        `${API_BASE_URL}/videos/upload`,
        form,
        token,
        (percent) => updateUploadProgress(uploadId, percent),
        () => markUploadFinishing(uploadId, 'Processing video…'),
      );
      finishUpload(uploadId, 'Video uploaded successfully');

      // The video itself is already live at this point — a failure funding
      // the reward is a separate, non-fatal problem, not an upload failure.
      if (rewardEnabled && uploadedVideo?.id) {
        try {
          const res = await fetchApi(`/videos/${uploadedVideo.id}/reward`, {
            method: 'POST',
            body: JSON.stringify({
              payoutMode,
              amountPerUnit: parsedAmountPerUnit,
              totalBudgetMsh: parsedTotalBudget,
            }),
          });
          const rewardData = await res.json();
          if (!res.ok) throw new Error(rewardData.message || 'Could not fund the reward');
          notify('success', 'Reward funded — viewers can now earn MSH watching this video');
        } catch (e: any) {
          notify('warning', `Video uploaded, but the reward wasn't funded: ${e.message || 'unknown error'}`);
        }
      }

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
    rewardCard: { borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, overflow: 'hidden' },
    rewardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
    rewardHeaderText: { ...TYPOGRAPHY.body1, fontWeight: '700' },
    rewardHeaderHint: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
    toggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: COLORS.border, padding: 3, justifyContent: 'center' },
    toggleOn: { backgroundColor: COLORS.primary },
    toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
    toggleKnobOn: { alignSelf: 'flex-end' },
    rewardBody: { padding: 14, paddingTop: 0, gap: 16 },
    payoutList: { gap: 8 },
    payoutOption: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
    payoutOptionActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}14` },
    radioOuter: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
    radioOuterActive: { borderColor: COLORS.primary },
    radioInner: { width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.primary },
    payoutOptionText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
    rewardRow: { flexDirection: 'row', gap: 12 },
    rewardField: { flex: 1, gap: 8 },
    balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    balanceText: { color: COLORS.textMuted, fontSize: 12 },
    balanceWarning: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
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

        {/* Video type */}
        <View style={styles.field}>
          <Text style={styles.label}>Video Type</Text>
          <View style={styles.catGrid}>
            {VIDEO_TYPES.map(t => (
              <TouchableOpacity
                key={t.value}
                style={[styles.catChip, videoType === t.value && styles.catChipActive]}
                onPress={() => setVideoType(t.value)}
              >
                <Text style={[styles.catChipText, videoType === t.value && styles.catChipTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reward funding */}
        <View style={styles.rewardCard}>
          <TouchableOpacity style={styles.rewardHeader} onPress={() => toggleReward(!rewardEnabled)} activeOpacity={0.8}>
            <View>
              <Text style={styles.rewardHeaderText}>Fund a reward for this video 💰</Text>
              <Text style={styles.rewardHeaderHint}>Pay viewers MSH for watching</Text>
            </View>
            <View style={[styles.toggle, rewardEnabled && styles.toggleOn]}>
              <View style={[styles.toggleKnob, rewardEnabled && styles.toggleKnobOn]} />
            </View>
          </TouchableOpacity>

          {rewardEnabled && (
            <View style={styles.rewardBody}>
              <View style={styles.field}>
                <Text style={styles.label}>Payout Mode</Text>
                <View style={styles.payoutList}>
                  {PAYOUT_MODES.map(m => (
                    <TouchableOpacity
                      key={m.value}
                      style={[styles.payoutOption, payoutMode === m.value && styles.payoutOptionActive]}
                      onPress={() => setPayoutMode(m.value)}
                    >
                      <View style={[styles.radioOuter, payoutMode === m.value && styles.radioOuterActive]}>
                        {payoutMode === m.value && <View style={styles.radioInner} />}
                      </View>
                      <Text style={styles.payoutOptionText}>{m.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.rewardRow}>
                <View style={styles.rewardField}>
                  <Text style={styles.label}>MSH per {selectedPayoutMode.unit}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 5"
                    placeholderTextColor={COLORS.textMuted}
                    value={amountPerUnit}
                    onChangeText={setAmountPerUnit}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.rewardField}>
                  <Text style={styles.label}>Total budget (MSH)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 500"
                    placeholderTextColor={COLORS.textMuted}
                    value={totalBudgetMsh}
                    onChangeText={setTotalBudgetMsh}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.balanceRow}>
                {walletLoading ? (
                  <ActivityIndicator size="small" color={COLORS.textMuted} />
                ) : walletBalance !== null ? (
                  <Text style={rewardExceedsBalance ? styles.balanceWarning : styles.balanceText}>
                    Wallet balance: {walletBalance} MSH
                    {rewardExceedsBalance ? ' — budget exceeds your balance' : ''}
                  </Text>
                ) : null}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
