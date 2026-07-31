import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Alert, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../utils/api';

interface FoundUser {
  userId: string;
  username: string;
  displayName?: string;
}

// A real family/co-workers/friends space — creates a Chat with type GROUP
// and every selected user as a member, distinct from AddContactScreen's
// 1:1 direct chats.
export default function CreateGroupScreen({ navigation }: any) {
  const [groupName, setGroupName] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoundUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Map<string, FoundUser>>(new Map());
  const [creating, setCreating] = useState(false);

  const searchUsers = async (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setResults([]);
      return;
    }
    try {
      setSearching(true);
      const res = await fetchApi(`/users/search?q=${encodeURIComponent(text)}`);
      if (res.ok) setResults(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const toggleMember = (u: FoundUser) => {
    setSelected(prev => {
      const next = new Map(prev);
      if (next.has(u.userId)) next.delete(u.userId);
      else next.set(u.userId, u);
      return next;
    });
  };

  const createGroup = async () => {
    const name = groupName.trim();
    if (!name || selected.size === 0 || creating) return;
    try {
      setCreating(true);
      const res = await fetchApi('/chats/group', {
        method: 'POST',
        body: JSON.stringify({ name, memberUserIds: Array.from(selected.keys()) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not create group');
      navigation.replace('ChatRoom', { roomId: data.id, roomName: name, roomType: 'Group' });
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setCreating(false);
    }
  };

  const renderUser = ({ item }: { item: FoundUser }) => {
    const isSelected = selected.has(item.userId);
    return (
      <TouchableOpacity style={styles.userItem} activeOpacity={0.7} onPress={() => toggleMember(item)}>
        <Image
          source={{ uri: `https://api.dicebear.com/7.x/avataaars/png?seed=${item.username}` }}
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <Text style={styles.displayName}>{item.displayName || item.username}</Text>
          <Text style={styles.username}>@{item.username}</Text>
        </View>
        <Ionicons
          name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={isSelected ? COLORS.primary : COLORS.textMuted}
        />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>New Group</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.nameSection}>
        <Ionicons name="people" size={20} color={COLORS.secondary} style={{ marginRight: 10 }} />
        <TextInput
          style={styles.nameInput}
          placeholder="Group name (e.g. Family, The Office)"
          placeholderTextColor={COLORS.textMuted}
          value={groupName}
          onChangeText={setGroupName}
        />
      </View>

      {selected.size > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={{ gap: 8, paddingHorizontal: SPACING.lg }}>
          {Array.from(selected.values()).map(u => (
            <TouchableOpacity key={u.userId} style={styles.chip} onPress={() => toggleMember(u)}>
              <Text style={styles.chipText}>{u.displayName || u.username}</Text>
              <Ionicons name="close" size={14} color={COLORS.text} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search people to add..."
          placeholderTextColor={COLORS.textMuted}
          value={query}
          onChangeText={searchUsers}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searching && <ActivityIndicator size="small" color={COLORS.secondary} style={styles.spinner} />}
      </View>

      <FlatList
        data={results}
        keyExtractor={item => item.userId}
        renderItem={renderUser}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          query.trim() !== '' && !searching ? <Text style={styles.emptyText}>No users found.</Text> : null
        }
      />

      <TouchableOpacity
        style={[styles.createBtn, (!groupName.trim() || selected.size === 0 || creating) && styles.createBtnDisabled]}
        onPress={createGroup}
        disabled={!groupName.trim() || selected.size === 0 || creating}
      >
        {creating ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Ionicons name="people" size={20} color="#FFF" />
            <Text style={styles.createBtnText}>Create Group{selected.size > 0 ? ` (${selected.size})` : ''}</Text>
          </>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backButton: { padding: 4 },
  nameSection: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, margin: 15, marginBottom: 10,
    paddingHorizontal: 15, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  nameInput: { flex: 1, color: COLORS.text, paddingVertical: 14, fontSize: 16 },
  chipRow: { maxHeight: 44, marginBottom: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
  },
  chipText: { color: '#FFF', fontWeight: '600', fontSize: 13 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, marginHorizontal: 15, marginBottom: 10,
    paddingHorizontal: 15, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: COLORS.text, paddingVertical: 12, fontSize: 16 },
  spinner: { marginLeft: 10 },
  list: { paddingHorizontal: 15, flexGrow: 1 },
  userItem: {
    flexDirection: 'row', alignItems: 'center', padding: 15,
    backgroundColor: COLORS.surface, borderRadius: 16, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.background, marginRight: 15 },
  userInfo: { flex: 1 },
  displayName: { ...TYPOGRAPHY.body1, fontWeight: 'bold' },
  username: { ...TYPOGRAPHY.body2, color: COLORS.textMuted },
  emptyText: { ...TYPOGRAPHY.body2, color: COLORS.textMuted, textAlign: 'center', marginTop: 20 },
  createBtn: {
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, margin: 15, padding: 16, borderRadius: 16,
  },
  createBtnDisabled: { opacity: 0.4 },
  createBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
