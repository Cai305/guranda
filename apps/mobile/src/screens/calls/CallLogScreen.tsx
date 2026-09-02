import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { fetchApi } from '../../utils/api';
import EmptyState from '../../components/EmptyState';

interface CallLogEntry {
  id: string;
  peerId: string;
  peerName: string;
  peerAvatarUrl: string | null;
  type: 'voice' | 'video';
  status: 'ringing' | 'ongoing' | 'completed' | 'missed' | 'declined';
  direction: 'incoming' | 'outgoing';
  startedAt: string;
  durationSeconds: number | null;
}

function formatDuration(totalSeconds: number | null): string {
  if (!totalSeconds || totalSeconds <= 0) return '';
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString();
}

export default function CallLogScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const { user } = useAuth();
  const { socket } = useSocket();
  const [calls, setCalls] = useState<CallLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/calls/log', { headers: { 'Cache-Control': 'no-cache' } });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setCalls(data);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const callBack = (entry: CallLogEntry, video: boolean) => {
    if (!socket || !user?.userId) return;
    socket.emit('call_invite', {
      callerId: user.userId,
      callerName: user.displayName || user.username,
      targetUserId: entry.peerId,
      video,
    });
  };

  const styles = useThemedStyles(({ COLORS, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', padding: SPACING.md,
      borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    headerTitle: { marginLeft: SPACING.sm },
    row: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
      borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surface, marginRight: SPACING.md },
    info: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    name: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    metaText: { color: COLORS.textMuted, fontSize: 12.5 },
    when: { color: COLORS.textMuted, fontSize: 12 },
    callBtn: { padding: 8, marginLeft: SPACING.sm },
  }));

  const renderItem = ({ item }: { item: CallLogEntry }) => {
    const statusLabel =
      item.status === 'missed' ? 'Missed' : item.status === 'declined' ? 'Declined' : formatDuration(item.durationSeconds) || 'No answer';
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate('UserProfile', { userId: item.peerId, username: item.peerName, avatarUrl: item.peerAvatarUrl })}
      >
        <Image
          source={{ uri: item.peerAvatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${item.peerName}` }}
          style={styles.avatar}
        />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Ionicons
              name={item.direction === 'outgoing' ? 'arrow-up-outline' : 'arrow-down-outline'}
              size={13}
              color={item.status === 'missed' ? COLORS.error : COLORS.textMuted}
            />
            <Text style={[styles.name, item.status === 'missed' && { color: COLORS.error }]}>{item.peerName}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name={item.type === 'video' ? 'videocam-outline' : 'call-outline'} size={12} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{statusLabel}</Text>
          </View>
        </View>
        <Text style={styles.when}>{formatWhen(item.startedAt)}</Text>
        <TouchableOpacity style={styles.callBtn} onPress={() => callBack(item, item.type === 'video')}>
          <Ionicons name={item.type === 'video' ? 'videocam' : 'call'} size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[TYPOGRAPHY.h2, styles.headerTitle]}>Call History</Text>
      </View>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={calls}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <EmptyState icon="call-outline" title="No calls yet" subtitle="Your voice and video calls will show up here." />
          }
          contentContainerStyle={calls.length === 0 ? { flex: 1 } : undefined}
        />
      )}
    </SafeAreaView>
  );
}
