import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { VideoView, useVideoPlayer } from 'expo-video';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../theme';
import { fetchApi, uploadMedia } from '../utils/api';

export default function CreatePostScreen({ navigation }: any) {
  const [content, setContent] = useState('');
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

  const handlePost = async () => {
    if (!content.trim() && !mediaUri) return;

    try {
      setLoading(true);
      let mediaUrl: string | undefined;
      let mediaType: 'IMAGE' | 'VIDEO' | undefined;
      if (mediaUri && mediaKind) {
        const uploaded = await uploadMedia(mediaUri, mediaKind);
        mediaUrl = uploaded.url;
        mediaType = uploaded.mediaType;
      }

      const res = await fetchApi('/posts', {
        method: 'POST',
        body: JSON.stringify({ content: content.trim(), mediaUrl, mediaType })
      });

      if (res.ok) {
        navigation.goBack();
      } else {
        Alert.alert('Error', 'Could not create post. Please try again.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const canPost = (content.trim().length > 0 || !!mediaUri) && !loading;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={TYPOGRAPHY.h3}>Create Post</Text>
          <TouchableOpacity
            style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
            onPress={handlePost}
            disabled={!canPost}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.surface} size="small" />
            ) : (
              <Text style={styles.postBtnText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder="What's on your mind?"
          placeholderTextColor={COLORS.textMuted}
          multiline
          autoFocus
          value={content}
          onChangeText={setContent}
          textAlignVertical="top"
        />

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
        ) : null}

        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.mediaBtn} onPress={pickMedia}>
            <Ionicons name="image-outline" size={22} color={COLORS.secondary} />
            <Text style={styles.mediaBtnText}>Photo / Video</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeBtn: {
    padding: 5,
  },
  postBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postBtnDisabled: {
    opacity: 0.5,
  },
  postBtnText: {
    ...TYPOGRAPHY.body2,
    color: COLORS.surface,
    fontWeight: 'bold',
  },
  input: {
    padding: 20,
    fontSize: 18,
    color: COLORS.text,
    minHeight: 120,
  },
  mediaPreviewWrap: {
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaPreview: {
    width: '100%',
    height: 280,
    backgroundColor: COLORS.surface,
  },
  removeMediaBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  toolbar: {
    flexDirection: 'row',
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 'auto',
  },
  mediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mediaBtnText: {
    ...TYPOGRAPHY.body2,
    color: COLORS.secondary,
  },
});
