import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi, uploadMedia } from '../utils/api';

const MAX_ITEMS = 10;

type MediaItem = { uri: string; kind: 'image' | 'video' };

export default function CreatePostScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  // Which slot the photo editor round-trip is updating — a ref because it
  // must survive navigating away to MediaEditor and back without resetting
  // (this screen instance stays mounted the whole time, just backgrounded).
  const editingIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (route?.params?.prefilledImageUri) {
      setMediaItems((prev) => [...prev, { uri: route.params.prefilledImageUri, kind: 'image' }]);
      navigation.setParams({ prefilledImageUri: undefined });
    }
  }, [route?.params?.prefilledImageUri]);

  useEffect(() => {
    if (route?.params?.editedImageUri) {
      const idx = editingIndexRef.current;
      const uri = route.params.editedImageUri;
      if (idx !== null) {
        setMediaItems((prev) => prev.map((m, i) => (i === idx ? { ...m, uri } : m)));
      }
      editingIndexRef.current = null;
      navigation.setParams({ editedImageUri: undefined });
    }
  }, [route?.params?.editedImageUri]);

  const editPhoto = (index: number) => {
    const item = mediaItems[index];
    if (!item || item.kind !== 'image') return;
    editingIndexRef.current = index;
    navigation.navigate('MediaEditor', {
      initialImageUri: item.uri,
      mode: 'photo',
      aspectRatio: 1,
      returnScreen: 'CreatePost',
      returnParamKey: 'editedImageUri',
    });
  };

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, RADIUS, SPACING }) => ({
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
    mediaStrip: {
      paddingHorizontal: SPACING.lg,
      gap: 10,
      paddingBottom: 8,
    },
    mediaThumbWrap: {
      width: 90,
      height: 90,
      borderRadius: RADIUS.md,
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: COLORS.surface,
    },
    mediaThumb: {
      width: '100%',
      height: '100%',
    },
    videoBadge: {
      position: 'absolute',
      bottom: 4,
      left: 4,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: 10,
      padding: 3,
    },
    removeMediaBtn: {
      position: 'absolute',
      top: 3,
      right: 3,
    },
    editMediaBtn: {
      position: 'absolute',
      bottom: 3,
      right: 3,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 12,
      padding: 3,
    },
    addMoreTile: {
      width: 90,
      height: 90,
      borderRadius: RADIUS.md,
      borderWidth: 1.5,
      borderColor: COLORS.border,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
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
  }));

  const pickMedia = async () => {
    const remaining = MAX_ITEMS - mediaItems.length;
    if (remaining <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (!result.canceled) {
      const picked: MediaItem[] = result.assets.map((a) => ({
        uri: a.uri,
        kind: a.type === 'video' ? 'video' : 'image',
      }));
      setMediaItems((prev) => [...prev, ...picked].slice(0, MAX_ITEMS));
    }
  };

  const removeMediaAt = (index: number) => {
    setMediaItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (!content.trim() && mediaItems.length === 0) return;

    try {
      setLoading(true);
      let media: { url: string; type: string }[] | undefined;
      if (mediaItems.length) {
        const uploaded = await Promise.all(
          mediaItems.map((m) => uploadMedia(m.uri, m.kind)),
        );
        media = uploaded.map((u) => ({ url: u.url, type: u.mediaType }));
      }

      const res = await fetchApi('/posts', {
        method: 'POST',
        body: JSON.stringify({ content: content.trim(), media }),
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

  const canPost = (content.trim().length > 0 || mediaItems.length > 0) && !loading;

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

        {mediaItems.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaStrip}>
            {mediaItems.map((item, index) => (
              <View key={`${item.uri}_${index}`} style={styles.mediaThumbWrap}>
                {item.kind === 'video' ? (
                  <VideoThumb uri={item.uri} style={styles.mediaThumb} />
                ) : (
                  <ExpoImage source={{ uri: item.uri }} style={styles.mediaThumb} contentFit="cover" cachePolicy="disk" />
                )}
                {item.kind === 'video' && (
                  <View style={styles.videoBadge}>
                    <Ionicons name="videocam" size={12} color="#fff" />
                  </View>
                )}
                {item.kind === 'image' && (
                  <TouchableOpacity style={styles.editMediaBtn} onPress={() => editPhoto(index)}>
                    <Ionicons name="color-wand-outline" size={14} color="#fff" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.removeMediaBtn} onPress={() => removeMediaAt(index)}>
                  <Ionicons name="close-circle" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {mediaItems.length < MAX_ITEMS && (
              <TouchableOpacity style={styles.addMoreTile} onPress={pickMedia}>
                <Ionicons name="add" size={26} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </ScrollView>
        )}

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

// Muted, non-interactive preview loop for a video thumbnail in the compose
// strip — full playback controls belong on the feed card, not here.
function VideoThumb({ uri, style }: { uri: string; style: any }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return <VideoView style={style} player={player} contentFit="cover" nativeControls={false} />;
}
