import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Alert, Image, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';

interface FoundUser {
  userId: string;
  username: string;
  displayName?: string;
}

export default function InviteToCommunityScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const { communityId, communityName } = route.params;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoundUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [sharingLink, setSharingLink] = useState(false);

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    backButton: { padding: 4 },
    shareCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: COLORS.surface, margin: 15, padding: 16, borderRadius: 16,
      borderWidth: 1, borderColor: COLORS.border,
    },
    shareIcon: {
      width: 44, height: 44, borderRadius: 22, backgroundColor: `${COLORS.primary}22`,
      alignItems: 'center', justifyContent: 'center',
    },
    shareTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    shareDesc: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
    sectionLabel: { ...TYPOGRAPHY.label, fontSize: 11, paddingHorizontal: SPACING.lg, marginTop: 10, marginBottom: 6 },
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
    invitedPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: `${COLORS.success}22` },
    invitedPillText: { color: COLORS.success, fontSize: 11, fontWeight: '700' },
  }));

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

  const inviteUser = async (u: FoundUser) => {
    try {
      setInvitingId(u.userId);
      const res = await fetchApi(`/communities/${communityId}/invite-user`, {
        method: 'POST',
        body: JSON.stringify({ userId: u.userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Couldn't send that invite");
      setInvited((prev) => new Set(prev).add(u.userId));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setInvitingId(null);
    }
  };

  const shareLink = async () => {
    try {
      setSharingLink(true);
      const res = await fetchApi(`/communities/${communityId}/invites`, { method: 'POST', body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Couldn't create an invite link");
      await Share.share({ message: `Join ${communityName} on Guranda! ${data.link}` });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSharingLink(false);
    }
  };

  const renderUser = ({ item }: { item: FoundUser }) => {
    const isInvited = invited.has(item.userId);
    return (
      <View style={styles.userItem}>
        <Image source={{ uri: `https://api.dicebear.com/7.x/avataaars/png?seed=${item.username}` }} style={styles.avatar} />
        <View style={styles.userInfo}>
          <Text style={styles.displayName}>{item.displayName || item.username}</Text>
          <Text style={styles.username}>@{item.username}</Text>
        </View>
        {isInvited ? (
          <View style={styles.invitedPill}><Text style={styles.invitedPillText}>INVITED</Text></View>
        ) : (
          <TouchableOpacity onPress={() => inviteUser(item)} disabled={invitingId === item.userId}>
            {invitingId === item.userId ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Invite</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Invite People</Text>
        <View style={{ width: 24 }} />
      </View>

      <TouchableOpacity style={styles.shareCard} onPress={shareLink} disabled={sharingLink}>
        <View style={styles.shareIcon}>
          {sharingLink ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="link" size={20} color={COLORS.primary} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.shareTitle}>Share invite link</Text>
          <Text style={styles.shareDesc}>Anyone with the link can join {communityName}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>OR INVITE SPECIFIC PEOPLE</Text>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search people to invite..."
          placeholderTextColor={COLORS.textMuted}
          value={query}
          onChangeText={searchUsers}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searching && <ActivityIndicator size="small" color={COLORS.primary} style={styles.spinner} />}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.userId}
        renderItem={renderUser}
        contentContainerStyle={styles.list}
        ListEmptyComponent={query.trim() !== '' && !searching ? <Text style={styles.emptyText}>No users found.</Text> : null}
      />
    </SafeAreaView>
  );
}
