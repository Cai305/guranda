import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi, uploadMedia } from '../utils/api';

export interface PickedSong {
  id: string;
  title: string;
  artistName: string;
  audioUrl: string;
  coverUrl: string | null;
  durationSeconds: number;
}

// Picks a song from the Guranda catalog (an artist's own uploads or the
// open/starter library) and hands it back to whichever screen opened this
// one — same "return via route params" convention MediaEditor already uses
// with CreateStoryScreen (returnScreen/returnParamKey), so this screen has
// no idea what it's feeding: a status's music picker and the lip-sync
// composer both open it the same way.
export default function SongPickerScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const returnScreen: string = route?.params?.returnScreen ?? 'Explore';
  const returnParamKey: string = route?.params?.returnParamKey ?? 'pickedSong';

  const [tab, setTab] = useState<'library' | 'mine'>('library');
  const [query, setQuery] = useState('');
  const [songs, setSongs] = useState<PickedSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadArtist, setUploadArtist] = useState('');
  const [uploadFile, setUploadFile] = useState<{ uri: string; name: string; mimeType: string | null; durationMs: number | null } | null>(null);
  const [uploading, setUploading] = useState(false);

  const previewPlayer = useAudioPlayer(null);
  const previewStatus = useAudioPlayerStatus(previewPlayer);

  const load = useCallback(async (t: 'library' | 'mine', q: string) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (t === 'mine') qs.set('mine', 'true');
      if (q.trim()) qs.set('query', q.trim());
      const res = await fetchApi(`/songs?${qs.toString()}`);
      const data = await res.json();
      setSongs(Array.isArray(data) ? data : []);
    } catch {
      setSongs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(tab, query); }, [tab, load]);
  useEffect(() => {
    const t = setTimeout(() => load(tab, query), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const togglePreview = (song: PickedSong) => {
    if (previewingId === song.id) {
      previewPlayer.pause();
      setPreviewingId(null);
      return;
    }
    previewPlayer.replace({ uri: song.audioUrl });
    previewPlayer.play();
    setPreviewingId(song.id);
  };

  const pick = (song: PickedSong) => {
    previewPlayer.pause();
    navigation.navigate(returnScreen, { [returnParamKey]: song });
  };

  const pickUploadFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
    if (result.canceled) return;
    const asset = result.assets[0];
    setUploadFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? null, durationMs: null });
    if (!uploadTitle) setUploadTitle(asset.name.replace(/\.[^.]+$/, ''));
  };

  const submitUpload = async () => {
    if (!uploadFile || !uploadTitle.trim() || !uploadArtist.trim()) {
      Alert.alert('Missing info', 'Add a title, artist name, and an audio file.');
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadMedia(uploadFile.uri, 'audio', { name: uploadFile.name, mimeType: uploadFile.mimeType ?? undefined });
      const durationSeconds = await probeDurationSeconds(url);
      const res = await fetchApi('/songs', {
        method: 'POST',
        body: JSON.stringify({ title: uploadTitle.trim(), artistName: uploadArtist.trim(), audioUrl: url, durationSeconds }),
      });
      const song = await res.json();
      if (!res.ok) throw new Error(song.message || 'Could not upload that song');
      setUploadOpen(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadArtist('');
      pick(song);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message || 'Something went wrong.');
    } finally {
      setUploading(false);
    }
  };

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
    tabRow: { flexDirection: 'row', marginHorizontal: SPACING.lg, marginTop: 6, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, padding: 4, gap: 4 },
    tabChip: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 999 },
    tabChipText: { fontSize: 13, fontWeight: '700' },
    searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: SPACING.lg, marginTop: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10 },
    searchInput: { flex: 1, color: COLORS.text, fontSize: 14 },
    uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: SPACING.lg, marginTop: 12, padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.primary },
    uploadBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    cover: { width: 48, height: 48, borderRadius: 10, backgroundColor: COLORS.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
    playBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    rowTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
    rowSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
    useBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: COLORS.primary },
    useBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 10, paddingHorizontal: SPACING.xl },
    emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
    uploadSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
    sheetOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
    grabber: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16 },
    fieldLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginTop: 14, marginBottom: 6 },
    fieldInput: { backgroundColor: COLORS.surfaceElevated, color: COLORS.text, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: 12, fontSize: 14 },
    fileBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 12 },
    fileBtnText: { color: COLORS.secondary, fontSize: 14, flex: 1 },
    submitBtn: { marginTop: 20, alignItems: 'center', padding: 16, borderRadius: RADIUS.md, backgroundColor: COLORS.primary },
    submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pick a song</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabChip, { backgroundColor: tab === 'library' ? COLORS.primary : 'transparent' }]} onPress={() => setTab('library')}>
          <Text style={[styles.tabChipText, { color: tab === 'library' ? '#fff' : COLORS.textMuted }]}>Library</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabChip, { backgroundColor: tab === 'mine' ? COLORS.primary : 'transparent' }]} onPress={() => setTab('mine')}>
          <Text style={[styles.tabChipText, { color: tab === 'mine' ? '#fff' : COLORS.textMuted }]}>My Sounds</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={COLORS.textMuted} />
        <TextInput style={styles.searchInput} value={query} onChangeText={setQuery} placeholder="Search title or artist" placeholderTextColor={COLORS.textMuted} />
      </View>

      <TouchableOpacity style={styles.uploadBtn} onPress={() => setUploadOpen(true)}>
        <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
        <Text style={styles.uploadBtnText}>Upload a song</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator color={COLORS.text} style={{ marginTop: 40 }} />
      ) : songs.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="musical-notes-outline" size={40} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>
            {tab === 'mine' ? "You haven't uploaded any sounds yet." : 'No open-library sounds yet — be the first to upload one.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <TouchableOpacity style={styles.playBtn} onPress={() => togglePreview(item)}>
                <Ionicons name={previewingId === item.id && previewStatus.playing ? 'pause' : 'play'} size={18} color={COLORS.text} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.rowSub} numberOfLines={1}>{item.artistName} · {Math.round(item.durationSeconds)}s</Text>
              </View>
              <TouchableOpacity style={styles.useBtn} onPress={() => pick(item)}>
                <Text style={styles.useBtnText}>Use</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {uploadOpen ? (
        <>
          <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => !uploading && setUploadOpen(false)} />
          <View style={styles.uploadSheet}>
            <View style={styles.grabber} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text }}>Upload a song</Text>
            <Text style={styles.fieldLabel}>AUDIO FILE</Text>
            <TouchableOpacity style={styles.fileBtn} onPress={pickUploadFile}>
              <Ionicons name="document-outline" size={18} color={COLORS.secondary} />
              <Text style={styles.fileBtnText} numberOfLines={1}>{uploadFile?.name ?? 'Choose an audio file'}</Text>
            </TouchableOpacity>
            <Text style={styles.fieldLabel}>TITLE</Text>
            <TextInput style={styles.fieldInput} value={uploadTitle} onChangeText={setUploadTitle} placeholder="Song title" placeholderTextColor={COLORS.textMuted} />
            <Text style={styles.fieldLabel}>ARTIST</Text>
            <TextInput style={styles.fieldInput} value={uploadArtist} onChangeText={setUploadArtist} placeholder="Artist name" placeholderTextColor={COLORS.textMuted} />
            <TouchableOpacity style={[styles.submitBtn, { opacity: uploading ? 0.6 : 1 }]} onPress={submitUpload} disabled={uploading}>
              {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Upload &amp; use</Text>}
            </TouchableOpacity>
          </View>
        </>
      ) : null}
    </SafeAreaView>
  );
}

// expo-audio's player doesn't expose duration synchronously on `replace()` —
// this loads the file into a throwaway player and waits one tick for its
// status to report a real duration, falling back to 30s (a safe default
// length for the trim/offset UI, never used for playback itself) if the
// probe genuinely can't resolve one in time.
async function probeDurationSeconds(url: string): Promise<number> {
  const { createAudioPlayer } = await import('expo-audio');
  return new Promise((resolve) => {
    let settled = false;
    const player = createAudioPlayer({ uri: url });
    const finish = (seconds: number) => {
      if (settled) return;
      settled = true;
      try { player.remove(); } catch {}
      resolve(seconds);
    };
    const poll = setInterval(() => {
      if (player.duration && player.duration > 0) {
        clearInterval(poll);
        finish(player.duration);
      }
    }, 150);
    setTimeout(() => { clearInterval(poll); finish(player.duration || 30); }, 3000);
  });
}
