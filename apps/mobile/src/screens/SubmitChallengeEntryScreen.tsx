import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { VideoView, useVideoPlayer } from 'expo-video';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../theme';
import { fetchApi, uploadMedia } from '../utils/api';

export default function SubmitChallengeEntryScreen({ route, navigation }: any) {
  const { challengeId, challengeTitle } = route.params;
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaKind, setMediaKind] = useState<'image' | 'video' | null>(null);

  const player = useVideoPlayer(mediaKind === 'video' ? mediaUri : null, p => { p.loop = true; });

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setMediaUri(asset.uri);
      setMediaKind(asset.type === 'video' ? 'video' : 'image');
    }
  };

  const removeMedia = () => {
    setMediaUri(null);
    setMediaKind(null);
  };

  const handleSubmit = async () => {
    if (!mediaUri || !mediaKind) return;
    try {
      setLoading(true);
      const uploaded = await uploadMedia(mediaUri, mediaKind);
      const res = await fetchApi(`/challenges/${challengeId}/entries`, {
        method: 'POST',
        body: JSON.stringify({
          mediaUrl: uploaded.url,
          mediaType: uploaded.mediaType,
          caption: caption.trim() || undefined,
        }),
      });
      if (res.ok) {
        navigation.goBack();
      } else {
        const data = await res.json().catch(() => null);
        Alert.alert('Error', data?.message || 'Could not submit your entry. Please try again.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !!mediaUri && !loading;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.keyboardContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={TYPOGRAPHY.h3} numberOfLines={1}>Submit Entry</Text>
          <TouchableOpacity
            style={[styles.postBtn, !canSubmit && styles.postBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.surface} size="small" />
            ) : (
              <Text style={styles.postBtnText}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.challengeLabel} numberOfLines={2}>{challengeTitle}</Text>

        {mediaUri ? (
          <View style={styles.mediaPreviewWrap}>
            {mediaKind === 'video' ? (
              <VideoView style={styles.mediaPreview} player={player} contentFit="cover" nativeControls={false} />
            ) : (
              <Image source={{ uri: mediaUri }} style={styles.mediaPreview} resizeMode="cover" />
            )}
            <TouchableOpacity style={styles.removeMediaBtn} onPress={removeMedia}>
              <Ionicons name="close-circle" size={26} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.pickWrap} onPress={pickMedia} activeOpacity={0.8}>
            <Ionicons name="cloud-upload-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.pickText}>Tap to add a photo or video</Text>
          </TouchableOpacity>
        )}

        <TextInput
          style={styles.input}
          placeholder="Add a caption…"
          placeholderTextColor={COLORS.textMuted}
          multiline
          value={caption}
          onChangeText={setCaption}
        />

        {mediaUri && (
          <TouchableOpacity style={styles.toolbar} onPress={pickMedia}>
            <Ionicons name="image-outline" size={20} color={COLORS.secondary} />
            <Text style={styles.mediaBtnText}>Change media</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  keyboardContainer: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  closeBtn: { padding: 5 },
  postBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  postBtnDisabled: { opacity: 0.5 },
  postBtnText: { ...TYPOGRAPHY.body2, color: COLORS.surface, fontWeight: 'bold' },
  challengeLabel: { color: COLORS.textMuted, fontSize: 13, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  pickWrap: {
    margin: SPACING.lg, height: 200, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surface,
  },
  pickText: { color: COLORS.textMuted, fontSize: 13 },
  mediaPreviewWrap: { margin: SPACING.lg, borderRadius: RADIUS.lg, overflow: 'hidden', position: 'relative' },
  mediaPreview: { width: '100%', height: 280, backgroundColor: COLORS.surface },
  removeMediaBtn: { position: 'absolute', top: 8, right: 8 },
  input: {
    marginHorizontal: SPACING.lg, padding: 12, fontSize: 15, color: COLORS.text,
    minHeight: 60, backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: SPACING.lg, marginTop: 'auto',
  },
  mediaBtnText: { ...TYPOGRAPHY.body2, color: COLORS.secondary },
});
