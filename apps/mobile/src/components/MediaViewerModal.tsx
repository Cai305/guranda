import React, { useState } from 'react';
import { Modal, View, TouchableOpacity, Image, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { downloadMediaToPhotos, shareRemoteFile } from '../utils/mediaExport';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface Props {
  visible: boolean;
  uri: string | null;
  isVideo: boolean;
  onClose: () => void;
}

// Tap-to-view full-screen viewer for chat images/videos — available to
// whoever is looking at the message, sender or recipient, since neither
// side had any way to see media beyond the small in-bubble thumbnail
// before this existed.
export default function MediaViewerModal({ visible, uri, isVideo, onClose }: Props) {
  const [busy, setBusy] = useState<'download' | 'share' | null>(null);
  const player = useVideoPlayer(isVideo && uri ? uri : null, (p) => { p.loop = false; });

  if (!uri) return null;

  const handleDownload = async () => {
    setBusy('download');
    try { await downloadMediaToPhotos(uri, isVideo ? 'video.mp4' : 'image.jpg'); }
    finally { setBusy(null); }
  };

  const handleShare = async () => {
    setBusy('share');
    try { await shareRemoteFile(uri, isVideo ? 'video.mp4' : 'image.jpg'); }
    finally { setBusy(null); }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn} hitSlop={12}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.mediaWrap}>
            {isVideo ? (
              <VideoView style={styles.media} player={player} allowsPictureInPicture nativeControls />
            ) : (
              <Image source={{ uri }} style={styles.media} resizeMode="contain" />
            )}
          </View>

          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleDownload} disabled={!!busy}>
              {busy === 'download'
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="download-outline" size={22} color="#fff" />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleShare} disabled={!!busy}>
              {busy === 'share'
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="share-outline" size={22} color="#fff" />}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000' },
  safe: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  mediaWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  media: { width: SCREEN_W, height: SCREEN_H * 0.75 },
  bottomBar: { flexDirection: 'row', justifyContent: 'center', gap: 28, paddingVertical: 18 },
  actionBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
});
