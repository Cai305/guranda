import React, { useState } from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet, Image, Share, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type * as MediaLibraryType from 'expo-media-library';
import { useTheme } from '../../context/ThemeContext';

// expo-media-library has no web implementation — load it only on native
const MediaLibrary: typeof MediaLibraryType | null =
  Platform.OS !== 'web' ? require('expo-media-library') : null;

const saveToGalleryWeb = (uri: string) => {
  const a = document.createElement('a');
  a.href = uri;
  a.download = 'poster.png';
  a.click();
};

export default function PosterResultScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { imageUri } = route.params ?? {};
  const [saving, setSaving] = useState(false);

  const saveToGallery = async () => {
    if (Platform.OS === 'web') {
      saveToGalleryWeb(imageUri);
      return;
    }
    if (!MediaLibrary) return;
    setSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo library access to save your poster.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(imageUri);
      Alert.alert('Saved', 'Your poster was saved to your photo library.');
    } catch (e) {
      Alert.alert("Couldn't save", e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const share = async () => {
    try {
      await Share.share({ url: imageUri, message: 'Made with Guranda' });
    } catch {}
  };

  const postAsStory = () => {
    navigation.navigate('CreateStory', { prefilledImageUri: imageUri });
  };

  const postAsPhoto = () => {
    navigation.navigate('CreatePost', { prefilledImageUri: imageUri });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.COLORS.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.popToTop()} style={styles.iconBtn}>
          <Ionicons name="close" size={26} color={theme.COLORS.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.COLORS.text }]}>Your Poster</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.previewWrap}>
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" /> : null}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity onPress={postAsStory} style={[styles.actionBtn, { backgroundColor: theme.COLORS.primary }]}>
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={styles.actionText}>Post as Story</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={postAsPhoto} style={[styles.actionBtn, { backgroundColor: theme.COLORS.surfaceElevated }]}>
          <Ionicons name="image-outline" size={18} color={theme.COLORS.text} />
          <Text style={[styles.actionText, { color: theme.COLORS.text }]}>Post as Photo</Text>
        </TouchableOpacity>
        <View style={styles.row}>
          <TouchableOpacity onPress={saveToGallery} disabled={saving} style={[styles.smallBtn, { backgroundColor: theme.COLORS.surfaceElevated }]}>
            {saving ? <ActivityIndicator size="small" color={theme.COLORS.text} /> : <Ionicons name="download-outline" size={18} color={theme.COLORS.text} />}
            <Text style={[styles.smallText, { color: theme.COLORS.text }]}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={share} style={[styles.smallBtn, { backgroundColor: theme.COLORS.surfaceElevated }]}>
            <Ionicons name="share-outline" size={18} color={theme.COLORS.text} />
            <Text style={[styles.smallText, { color: theme.COLORS.text }]}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  iconBtn: { padding: 8 },
  title: { fontSize: 17, fontWeight: '700' },
  previewWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  preview: { width: '100%', height: '100%', borderRadius: 16 },
  actions: { padding: 20, gap: 10 },
  actionBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14 },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  row: { flexDirection: 'row', gap: 10 },
  smallBtn: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 14 },
  smallText: { fontWeight: '700', fontSize: 13 },
});
