import { Platform, Alert, Linking } from 'react-native';
import { File, Paths } from 'expo-file-system';
import type * as MediaLibraryType from 'expo-media-library';
import * as Sharing from 'expo-sharing';

// expo-media-library has no web implementation — its own module-level code
// throws ("Cannot find native module 'ExpoMediaLibraryNext'") the instant
// it's evaluated, which would crash the entire web bundle if imported
// statically (this file is reachable from ChatScreen's import graph). Same
// guard PosterResultScreen.tsx already uses.
const MediaLibrary: typeof MediaLibraryType | null =
  Platform.OS !== 'web' ? require('expo-media-library') : null;

// Shared by MediaViewerModal (chat images/videos) and FileMiniCard (chat
// documents) — both need "pull a remote URL onto the device" before they
// can hand it to MediaLibrary/Sharing, which only accept local file URIs.
// expo-file-system's SDK 56 API is class-based (File/Directory/Paths) —
// the old FileSystem.downloadAsync/cacheDirectory string API moved to
// 'expo-file-system/legacy'; this uses the current one.
async function downloadToCache(url: string, suggestedName: string): Promise<string> {
  const safeName = suggestedName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'download';
  const destination = new File(Paths.cache, `${Date.now()}_${safeName}`);
  const file = await File.downloadFileAsync(url, destination);
  return file.uri;
}

// Saves an image/video into the device's Photos/Camera Roll — the concrete,
// well-understood meaning of "download" for media, distinct from generic
// document export below.
export async function downloadMediaToPhotos(url: string, name: string): Promise<void> {
  if (Platform.OS === 'web') {
    // No Photos app on web — the browser's own "Save image as…" is the
    // closest equivalent, triggered by opening the asset in a new tab.
    Linking.openURL(url);
    return;
  }
  if (!MediaLibrary) return;
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission needed', 'Allow access to Photos to save this.');
    return;
  }
  try {
    const localUri = await downloadToCache(url, name);
    await MediaLibrary.saveToLibraryAsync(localUri);
    Alert.alert('Saved', 'Saved to your Photos.');
  } catch (e: any) {
    Alert.alert('Download failed', e.message || 'Could not save this file.');
  }
}

// Opens the native share sheet with the actual file data (not just the
// URL) — works for images, videos, and arbitrary documents alike, and on
// both platforms the share sheet itself offers "Save to Files/Downloads"
// as one of the destinations, so this doubles as "download" for
// non-photo files that MediaLibrary has no concept of.
export async function shareRemoteFile(url: string, name: string): Promise<void> {
  if (Platform.OS === 'web') {
    Linking.openURL(url);
    return;
  }
  try {
    const localUri = await downloadToCache(url, name);
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert('Sharing unavailable', 'This device cannot open the share sheet.');
      return;
    }
    await Sharing.shareAsync(localUri, { dialogTitle: name });
  } catch (e: any) {
    Alert.alert('Share failed', e.message || 'Could not share this file.');
  }
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
