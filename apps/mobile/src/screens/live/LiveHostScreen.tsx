import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../../theme';
import { getLiveCategory } from '../../config/liveCategories';
import { formatCount } from '../../utils/format';
import { endRoom } from '../../data/liveApi';
import LiveVideoView from '../../components/LiveVideoView';
import * as LiveKit from '../../live/liveKit';
import LiveCategoryHostPanel from '../../components/live/LiveCategoryHostPanel';
import { useLiveSocket } from '../../live/useLiveSocket';
import { useAuth } from '../../context/AuthContext';

// Host-side studio. On web, with a real room from GoLiveScreen,
// this publishes actual camera/mic to LiveKit. Everywhere else
// (native, or no room) it falls back to the original simulated
// preview so the screen never breaks — just labeled honestly.
export default function LiveHostScreen({ navigation, route }: any) {
  const { title, categoryId, guestCount = 0, moderatorsOn, roomId, roomName, token, wsUrl } = route?.params || {};
  const category = getLiveCategory(categoryId);
  const isReal = Platform.OS === 'web' && !!roomId && !!token;
  const { user } = useAuth();
  
  // Real or simulated room name for socket event scope
  const actualRoomName = roomName || `mock-room-${title}`;
  const hostName = user?.displayName || user?.username || 'Host';
  const { raisedHands, speakers, sendAudioRoomEvent } = useLiveSocket(actualRoomName, hostName);

  const [viewers, setViewers] = useState(1);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [connectionState, setConnectionState] = useState<'connecting' | 'live' | 'error'>(isReal ? 'connecting' : 'live');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<any>(null);
  const sessionRef = useRef<any>(null);

  // Wall-clock elapsed timer runs in both real and simulated mode.
  useEffect(() => {
    const interval = setInterval(() => setElapsed(e => e + 1), 2000);
    return () => clearInterval(interval);
  }, []);

  // Simulated viewer count only when there's no real room to report real numbers.
  useEffect(() => {
    if (isReal) return;
    const interval = setInterval(() => setViewers(v => v + Math.floor(Math.random() * 4)), 2000);
    return () => clearInterval(interval);
  }, [isReal]);

  useEffect(() => {
    if (!isReal) return;
    let cancelled = false;

    LiveKit.connectAsHost(wsUrl, token, (n: number) => !cancelled && setViewers(n))
      .then((session: any) => {
        if (cancelled) {
          session.disconnect();
          return;
        }
        sessionRef.current = session;
        setLocalVideoTrack(session.localVideoTrack);
        setConnectionState('live');
      })
      .catch((err: any) => {
        if (cancelled) return;
        setConnectionState('error');
        setConnectionError(err?.message || 'Could not access your camera/microphone.');
      });

    return () => {
      cancelled = true;
      sessionRef.current?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReal]);

  const mins = Math.floor(elapsed * 2 / 60);
  const secs = (elapsed * 2) % 60;
  const timeLabel = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const endStream = () => {
    Alert.alert('End Stream', 'Are you sure you want to end this live stream?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Stream',
        style: 'destructive',
        onPress: async () => {
          await sessionRef.current?.disconnect();
          if (isReal && roomId) {
            try { await endRoom(roomId); } catch { /* room may already be gone */ }
          }
          navigation.navigate('Live');
        },
      },
    ]);
  };

  const toggleMic = async () => {
    setMuted(m => !m);
    if (isReal && sessionRef.current) {
      await sessionRef.current.room.localParticipant.setMicrophoneEnabled(muted);
    }
  };

  const toggleCamera = async () => {
    setCameraOn(c => !c);
    if (isReal && sessionRef.current) {
      await sessionRef.current.room.localParticipant.setCameraEnabled(!cameraOn);
    }
  };

  const comingSoon = (feature: string) =>
    Alert.alert('Coming Soon 🚧', `${feature} will be available once Guranda Live's full broadcasting infrastructure ships.`);

  const handleAllocateTime = (username: string) => {
    Alert.alert(`Allocate Time to ${username}`, 'How much time should this speaker get?', [
      { text: '1 Minute', onPress: () => sendAudioRoomEvent('allocate_time', { username, durationMs: 60000 }) },
      { text: '3 Minutes', onPress: () => sendAudioRoomEvent('allocate_time', { username, durationMs: 180000 }) },
      { text: '5 Minutes', onPress: () => sendAudioRoomEvent('allocate_time', { username, durationMs: 300000 }) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleRemoveSpeaker = (username: string) => {
    sendAudioRoomEvent('allocate_time', { username, durationMs: 0 }); // 0 time effectively mutes them instantly
  };

  const activeSpeakers = Object.entries(speakers).filter(([_, s]) => s.timerEnd > Date.now());

  const [modPanelOpen, setModPanelOpen] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Absolute Full Screen Camera / Gradient Background */}
      {isReal && connectionState === 'live' && cameraOn ? (
        <View style={StyleSheet.absoluteFill}>
          <LiveVideoView track={localVideoTrack} muted mirror />
        </View>
      ) : (
        <LinearGradient
          colors={category?.gradient || ['#333', '#111']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        >
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            {isReal && connectionState === 'connecting' ? (
              <ActivityIndicator size="large" color="#FFF" />
            ) : (
              <Ionicons
                name={cameraOn ? (category?.icon as any || 'radio') : 'videocam-off'}
                size={80}
                color="rgba(255,255,255,0.25)"
              />
            )}
          </View>
        </LinearGradient>
      )}

      {/* Top gradient for readability */}
      <LinearGradient
        colors={['rgba(0,0,0,0.65)', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 130 }}
        pointerEvents="none"
      />

      {/* Bottom gradient for controls */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.82)']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 260 }}
        pointerEvents="none"
      />

      {/* ── TOP BAR ── */}
      <View style={styles.topBar}>
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.livePillText}>{connectionState === 'connecting' ? 'STARTING' : 'LIVE'}</Text>
        </View>

        <View style={styles.statsPills}>
          <View style={styles.statPill}>
            <Ionicons name="eye" size={12} color="#FFF" />
            <Text style={styles.statPillText}>{formatCount(viewers)}</Text>
          </View>
          <View style={styles.statPill}>
            <Ionicons name="time-outline" size={12} color="#FFF" />
            <Text style={styles.statPillText}>{timeLabel}</Text>
          </View>
        </View>

        {moderatorsOn && (
          <TouchableOpacity style={styles.modToggleBtn} onPress={() => setModPanelOpen(o => !o)}>
            <Ionicons name="people" size={18} color="#FFF" />
            {raisedHands.length > 0 && (
              <View style={styles.modBadge}>
                <Text style={styles.modBadgeText}>{raisedHands.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* ── STREAM TITLE ── */}
      <View style={{ position: 'absolute', top: 72, left: SPACING.lg, right: SPACING.lg }} pointerEvents="none">
        <Text style={styles.streamTitle} numberOfLines={1}>{title}</Text>
      </View>

      {/* ── MODERATOR PANEL (floating bottom sheet style) ── */}
      {modPanelOpen && moderatorsOn && (
        <View style={styles.modPanel}>
          <View style={styles.modPanelHeader}>
            <Text style={styles.modPanelTitle}>Moderator Controls</Text>
            <TouchableOpacity onPress={() => setModPanelOpen(false)}>
              <Ionicons name="close" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.modBoxTitle}>Raised Hands ({raisedHands.length})</Text>
            {raisedHands.length === 0 ? (
              <Text style={styles.modBoxEmpty}>No raised hands.</Text>
            ) : (
              raisedHands.map(hand => (
                <View key={hand} style={styles.modRow}>
                  <Text style={styles.modRowName}>{hand}</Text>
                  <TouchableOpacity style={styles.modActionBtn} onPress={() => handleAllocateTime(hand)}>
                    <Text style={styles.modActionText}>Allocate Time</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
            <Text style={[styles.modBoxTitle, { marginTop: 12 }]}>Active Speakers ({activeSpeakers.length})</Text>
            {activeSpeakers.length === 0 ? (
              <Text style={styles.modBoxEmpty}>No active speakers.</Text>
            ) : (
              activeSpeakers.map(([name, state]) => {
                const remaining = Math.max(0, Math.floor((state.timerEnd - Date.now()) / 1000));
                const m = Math.floor(remaining / 60);
                const s = remaining % 60;
                return (
                  <View key={name} style={styles.modRow}>
                    <View>
                      <Text style={styles.modRowName}>{name}</Text>
                      <Text style={styles.modRowSub}>{m}:{s.toString().padStart(2, '0')} remaining</Text>
                    </View>
                    <TouchableOpacity style={[styles.modActionBtn, { backgroundColor: COLORS.error }]} onPress={() => handleRemoveSpeaker(name)}>
                      <Text style={styles.modActionText}>Revoke</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      )}

      {/* ── BOTTOM FLOATING CONTROLS ── */}
      <View style={styles.bottomControls}>
        {/* Connection banner */}
        {isReal && (
          <View style={[styles.floatingBanner, connectionState === 'error' && styles.floatingBannerError]}>
            <Ionicons
              name={connectionState === 'error' ? 'alert-circle-outline' : 'radio'}
              size={14}
              color={connectionState === 'error' ? COLORS.error : COLORS.success}
            />
            <Text style={[styles.floatingBannerText, { color: connectionState === 'error' ? COLORS.error : COLORS.success }]} numberOfLines={2}>
              {connectionState === 'error'
                ? connectionError || 'Camera/microphone error.'
                : 'Broadcasting live — viewers can watch you now.'}
            </Text>
          </View>
        )}

        {/* Camera / Mic / Invite Controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity style={[styles.controlBtn, muted && styles.controlBtnOff]} onPress={toggleMic}>
            <Ionicons name={muted ? 'mic-off' : 'mic'} size={22} color={muted ? COLORS.error : '#FFF'} />
            <Text style={styles.controlLabel}>{muted ? 'Muted' : 'Mic'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlBtn, !cameraOn && styles.controlBtnOff]} onPress={toggleCamera}>
            <Ionicons name={cameraOn ? 'videocam' : 'videocam-off'} size={22} color={!cameraOn ? COLORS.error : '#FFF'} />
            <Text style={styles.controlLabel}>{cameraOn ? 'Camera' : 'Off'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={() => comingSoon('Multi-guest streaming')}>
            <Ionicons name="person-add-outline" size={22} color="#FFF" />
            <Text style={styles.controlLabel}>Invite ({guestCount})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlBtn, styles.endBtnSmall]} onPress={endStream}>
            <Ionicons name="stop-circle" size={22} color="#FFF" />
            <Text style={styles.controlLabel}>End</Text>
          </TouchableOpacity>
        </View>

        {isReal && roomId && <LiveCategoryHostPanel categoryId={categoryId} roomId={roomId} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    zIndex: 10,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF3B30' },
  livePillText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  statsPills: { flexDirection: 'row', gap: 8 },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statPillText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  streamTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 6,
    textAlign: 'center',
  },
  modToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  modBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  modPanel: {
    position: 'absolute',
    bottom: 200,
    left: SPACING.lg,
    right: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    zIndex: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modPanelTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  modBoxTitle: { color: COLORS.text, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  modBoxEmpty: { color: COLORS.textMuted, fontSize: 12, fontStyle: 'italic', marginBottom: 4 },
  modRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modRowName: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  modRowSub: { color: COLORS.primary, fontSize: 11, marginTop: 2 },
  modActionBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  modActionText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  floatingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  floatingBannerError: {
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.4)',
  },
  floatingBannerText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.sm,
  },
  controlBtn: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 60,
  },
  controlBtnOff: {
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.5)',
  },
  controlLabel: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  endBtnSmall: {
    backgroundColor: 'rgba(220, 38, 38, 0.7)',
  },
});


