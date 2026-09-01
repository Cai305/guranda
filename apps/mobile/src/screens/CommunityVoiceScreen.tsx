import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import { connectToVoiceChannel, VoiceSession, VoiceParticipant } from '../live/communityVoice';

export default function CommunityVoiceScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const { communityId, channelId, channelName } = route.params;

  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const sessionRef = useRef<VoiceSession | null>(null);

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { alignItems: 'center', paddingTop: SPACING.xl, paddingBottom: SPACING.lg },
    channelName: { ...TYPOGRAPHY.h2 },
    statusText: { color: COLORS.textMuted, marginTop: 4 },
    centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    errorText: { color: COLORS.error, textAlign: 'center', paddingHorizontal: 30 },
    list: { paddingHorizontal: SPACING.lg, gap: 10 },
    participantRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: COLORS.border,
    },
    avatar: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary + '22',
      alignItems: 'center', justifyContent: 'center',
    },
    participantName: { color: COLORS.text, fontWeight: '600', fontSize: 15 },
    controls: { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingVertical: 30 },
    controlBtn: {
      width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center',
      backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border,
    },
    leaveBtn: { backgroundColor: COLORS.error },
    mutedBtn: { backgroundColor: COLORS.primary },
  }));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchApi(`/communities/${communityId}/channels/${channelId}/voice/join`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Couldn't join this voice channel");
        if (Platform.OS !== 'web') throw new Error('Voice channels are only available on web right now.');
        if (cancelled) return;
        const session = await connectToVoiceChannel(data.wsUrl, data.token, (list) => {
          if (!cancelled) setParticipants(list);
        });
        if (cancelled) {
          session.disconnect();
          return;
        }
        sessionRef.current = session;
        setStatus('connected');
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || 'Failed to join voice channel');
          setStatus('error');
        }
      }
    })();
    return () => {
      cancelled = true;
      sessionRef.current?.disconnect();
    };
  }, [communityId, channelId]);

  const toggleMute = async () => {
    const next = !muted;
    setMuted(next);
    await sessionRef.current?.setMuted(next);
  };

  const leave = () => {
    sessionRef.current?.disconnect();
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.channelName}>#{channelName}</Text>
        <Text style={styles.statusText}>
          {status === 'connecting' ? 'Connecting…' : status === 'connected' ? `${participants.length} in the channel` : 'Failed to connect'}
        </Text>
      </View>

      {status === 'connecting' && (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}

      {status === 'error' && (
        <View style={styles.centerFill}>
          <Ionicons name="alert-circle-outline" size={40} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {status === 'connected' && (
        <FlatList
          data={participants}
          keyExtractor={(p) => p.identity}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.participantRow}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.participantName}>{item.name}</Text>
              <Ionicons name="mic" size={16} color={COLORS.success} style={{ marginLeft: 'auto' }} />
            </View>
          )}
        />
      )}

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlBtn, muted && styles.mutedBtn]}
          onPress={toggleMute}
          disabled={status !== 'connected'}
        >
          <Ionicons name={muted ? 'mic-off' : 'mic'} size={24} color={muted ? '#fff' : COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlBtn, styles.leaveBtn]} onPress={leave}>
          <Ionicons name="call" size={24} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
