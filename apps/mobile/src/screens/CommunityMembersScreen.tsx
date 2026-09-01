import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, Image, ActionSheetIOS, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../utils/api';
import { CommunityMemberDto } from '@mxit2/types';

const ROLE_LABEL: Record<string, string> = { ADMIN: 'Admin', MOD: 'Moderator', MEMBER: 'Member' };

export default function CommunityMembersScreen({ route }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const { user } = useAuth();
  const { communityId } = route.params;
  const [members, setMembers] = useState<CommunityMemberDto[]>([]);
  const [myRole, setMyRole] = useState<string>('MEMBER');
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [membersRes, detailsRes] = await Promise.all([
        fetchApi(`/communities/${communityId}/members`, { headers: { 'Cache-Control': 'no-cache' } }),
        fetchApi(`/communities/${communityId}`, { headers: { 'Cache-Control': 'no-cache' } }),
      ]);
      if (membersRes.ok) setMembers(await membersRes.json());
      if (detailsRes.ok) {
        const details = await detailsRes.json();
        setMyRole(details.myRole || 'MEMBER');
      }
    } catch {}
    setLoading(false);
  }, [communityId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const styles = useThemedStyles(({ COLORS, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: SPACING.lg, gap: 10 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: COLORS.surface,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.background },
    name: { color: COLORS.text, fontWeight: '700', fontSize: 15 },
    username: { color: COLORS.textMuted, fontSize: 12 },
    rolePill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: COLORS.background,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    rolePillAdmin: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}18` },
    rolePillText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700' },
    rolePillTextAdmin: { color: COLORS.primary },
  }));

  const canManage = myRole === 'ADMIN' || myRole === 'MOD';

  const openActions = (member: CommunityMemberDto) => {
    if (!canManage || member.userId === user?.userId) return;
    // Mods can only manage plain members; admins can manage mods too.
    if (myRole === 'MOD' && member.role !== 'MEMBER') return;

    const options: { label: string; action: () => void; destructive?: boolean }[] = [];
    if (myRole === 'ADMIN') {
      if (member.role !== 'ADMIN') options.push({ label: 'Promote to Admin', action: () => setRole(member, 'ADMIN') });
      if (member.role !== 'MOD') options.push({ label: 'Make Moderator', action: () => setRole(member, 'MOD') });
      if (member.role !== 'MEMBER') options.push({ label: 'Demote to Member', action: () => setRole(member, 'MEMBER') });
    }
    options.push({ label: 'Remove from community', action: () => removeMember(member), destructive: true });

    const labels = [...options.map((o) => o.label), 'Cancel'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: labels, cancelButtonIndex: labels.length - 1, destructiveButtonIndex: options.findIndex((o) => o.destructive) },
        (index) => { if (index < options.length) options[index].action(); },
      );
    } else {
      Alert.alert(
        member.user.profile?.displayName || member.user.username,
        undefined,
        [...options.map((o) => ({ text: o.label, style: o.destructive ? 'destructive' as const : undefined, onPress: o.action })), { text: 'Cancel', style: 'cancel' as const }],
      );
    }
  };

  const setRole = async (member: CommunityMemberDto, role: string) => {
    const res = await fetchApi(`/communities/${communityId}/members/${member.userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
    if (res.ok) load();
    else Alert.alert('Error', (await res.json().catch(() => null))?.message || "Couldn't change that member's role.");
  };

  const removeMember = async (member: CommunityMemberDto) => {
    setRemovingId(member.userId);
    try {
      const res = await fetchApi(`/communities/${communityId}/members/${member.userId}`, { method: 'DELETE' });
      if (res.ok) load();
      else Alert.alert('Error', (await res.json().catch(() => null))?.message || "Couldn't remove that member.");
    } catch {
      Alert.alert('Error', "Couldn't remove that member.");
    } finally {
      setRemovingId(null);
    }
  };

  const renderMember = ({ item }: { item: CommunityMemberDto }) => (
    <TouchableOpacity style={styles.row} activeOpacity={0.8} onPress={() => openActions(item)} disabled={removingId === item.userId}>
      <Image
        source={{ uri: item.user.profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${item.user.username}` }}
        style={styles.avatar}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.user.profile?.displayName || item.user.username}</Text>
        <Text style={styles.username}>@{item.user.username}</Text>
      </View>
      {removingId === item.userId ? (
        <ActivityIndicator size="small" color={COLORS.primary} />
      ) : (
        <View style={[styles.rolePill, item.role === 'ADMIN' && styles.rolePillAdmin]}>
          <Text style={[styles.rolePillText, item.role === 'ADMIN' && styles.rolePillTextAdmin]}>{ROLE_LABEL[item.role]}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={renderMember}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}
