import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';

export default function PlaylistsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    title: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    addBtn: { padding: 4 },
    playlistRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
    playlistThumb: { width: 52, height: 52, borderRadius: 10, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
    playlistInfo: { flex: 1 },
    playlistName: { ...TYPOGRAPHY.body1, fontWeight: '700', marginBottom: 2 },
    playlistCount: { color: COLORS.textMuted, fontSize: 12 },
    playlistActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    deleteBtn: { padding: 4 },
    sep: { height: 1, backgroundColor: COLORS.border },
    empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
    emptyTitle: { ...TYPOGRAPHY.h3, color: COLORS.textMuted },
    emptyBtn: { marginTop: 4, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
    emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: { backgroundColor: COLORS.surfaceElevated, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: SPACING.lg, paddingBottom: 40, gap: 16 },
    sheetTitle: { ...TYPOGRAPHY.h3, textAlign: 'center' },
    nameInput: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14, color: COLORS.text, fontSize: 15 },
    createBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
    createBtnDisabled: { opacity: 0.5 },
    createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  }));

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/videos/playlists/mine');
      const d = await res.json();
      setPlaylists(Array.isArray(d) ? d : []);
    } catch { setPlaylists([]); }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const create = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetchApi('/videos/playlists', { method: 'POST', body: JSON.stringify({ name: newName.trim() }) });
      const pl = await res.json();
      setPlaylists(prev => [pl, ...prev]);
      setShowCreate(false);
      setNewName('');
    } catch { Alert.alert('Error', 'Could not create playlist'); }
    setCreating(false);
  };

  const deletePlaylist = (id: string, name: string) => {
    Alert.alert('Delete playlist', `Delete "${name}"? All saved videos will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setPlaylists(prev => prev.filter(p => p.id !== id));
          await fetchApi(`/videos/playlists/${id}`, { method: 'DELETE' });
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>My Playlists</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={p => p.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingTop: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.playlistRow} onPress={() => navigation.navigate('PlaylistDetail', { playlistId: item.id, playlistName: item.name })}>
              <View style={styles.playlistThumb}>
                <Ionicons name="list" size={28} color={COLORS.primary} />
              </View>
              <View style={styles.playlistInfo}>
                <Text style={styles.playlistName}>{item.name}</Text>
                <Text style={styles.playlistCount}>{item._count?.videos ?? 0} videos</Text>
              </View>
              <View style={styles.playlistActions}>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => deletePlaylist(item.id, item.name)}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              </View>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="list-outline" size={64} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No playlists yet</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowCreate(true)}>
                <Text style={styles.emptyBtnText}>Create playlist</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Create playlist modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowCreate(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>New Playlist</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="Playlist name"
            placeholderTextColor={COLORS.textMuted}
            value={newName}
            onChangeText={setNewName}
            autoFocus
            maxLength={60}
          />
          <TouchableOpacity style={[styles.createBtn, (!newName.trim() || creating) && styles.createBtnDisabled]} onPress={create} disabled={!newName.trim() || creating}>
            <Text style={styles.createBtnText}>{creating ? 'Creating…' : 'Create'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
