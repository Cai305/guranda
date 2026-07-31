import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import io from 'socket.io-client';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL, fetchApi } from '../../utils/api';

export default function FriendsListScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const pickForRoomId: string | undefined = route.params?.pickForRoomId;
  const [friends, setFriends] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchApi('/friends').then((r) => (r.ok ? r.json() : [])),
      fetchApi('/friends/pending').then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([f, p]) => {
        setFriends(Array.isArray(f) ? f : []);
        setPending(Array.isArray(p) ? p : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const sendRequest = async () => {
    if (!username.trim()) return;
    setSending(true);
    try {
      const res = await fetchApi('/friends/request', { method: 'POST', body: JSON.stringify({ username: username.trim() }) });
      if (!res.ok) throw new Error((await res.json())?.message || 'Failed to send request');
      setUsername('');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSending(false);
    }
  };

  const respond = async (id: string, action: 'accept' | 'decline') => {
    await fetchApi(`/friends/${id}/${action}`, { method: 'POST' });
    load();
  };

  const invite = (friendUserId: string) => {
    if (!pickForRoomId || !user) return;
    const sock = io(`${API_BASE_URL}/cards`);
    sock.on('connect', () => {
      sock.emit('invite_friend_to_room', { roomId: pickForRoomId, requesterId: user.userId, friendUserId });
      setTimeout(() => sock.disconnect(), 500);
    });
    Alert.alert('Invite sent');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>{pickForRoomId ? 'Invite a Friend' : 'Friends'}</Text>
        <View style={{ width: 36 }} />
      </View>

      {!pickForRoomId && (
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            placeholder="Add by username"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />
          <TouchableOpacity style={styles.addBtn} onPress={sendRequest} disabled={sending}>
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="person-add" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      )}

      {!pickForRoomId && pending.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Pending Requests</Text>
          {pending.map((p) => (
            <View key={p.id} style={styles.pendingRow}>
              <Text style={styles.friendName}>{p.requester?.profile?.displayName || p.requester?.username}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => respond(p.id, 'accept')}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.declineBtn} onPress={() => respond(p.id, 'decline')}>
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      )}

      <Text style={styles.sectionLabel}>Friends</Text>
      <FlatList
        data={friends}
        keyExtractor={(f) => f.friendshipId}
        contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.friendRow}
            onPress={pickForRoomId ? () => invite(item.user.id) : undefined}
            disabled={!pickForRoomId}
          >
            <Ionicons name="person-circle" size={28} color={COLORS.primary} />
            <Text style={styles.friendName}>{item.user?.profile?.displayName || item.user?.username}</Text>
            {pickForRoomId && <Ionicons name="send" size={16} color={COLORS.textMuted} />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: SPACING.xl }}>
            {loading ? <ActivityIndicator color={COLORS.primary} /> : <Text style={{ color: COLORS.textMuted }}>No friends yet — add one above.</Text>}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  addRow: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  addInput: {
    flex: 1, backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, color: COLORS.text,
  },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, width: 44, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { ...TYPOGRAPHY.label, paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  pendingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm,
  },
  acceptBtn: { backgroundColor: COLORS.success, borderRadius: RADIUS.pill, padding: 8 },
  declineBtn: { backgroundColor: COLORS.error, borderRadius: RADIUS.pill, padding: 8 },
  friendRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm,
  },
  friendName: { color: COLORS.text, fontWeight: '600', flex: 1 },
});
