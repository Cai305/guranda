import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, Platform, Animated, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useSocket } from '../../context/SocketContext';
import LiveVideoView from '../../components/LiveVideoView';
import CustomEmoji from '../../components/live/CustomEmoji';
import { connectToCall, CallSession } from '../../live/liveCall';
import { VEMOJI_CATALOG, VemojiType } from '@mxit2/types';

const AudioContainer: any = Platform.OS === 'web' ? View : View;

interface FloatingReaction {
  id: string;
  type: VemojiType;
  left: number;
}

interface Participant {
  userId: string;
  name: string;
  videoTrack: any;
  audioTrack: any;
  joined: boolean; // false while still ringing, true once actually in the room
}

function FloatingVemoji({ type, left }: { type: VemojiType; left: number }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const styles = useThemedStyles(() => ({ floatingVemoji: { position: 'absolute', bottom: 0 } }));
  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -180, duration: 1700, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 1700, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[styles.floatingVemoji, { left, opacity, transform: [{ translateY }] }]} pointerEvents="none">
      <CustomEmoji type={type} size={40} />
    </Animated.View>
  );
}

function ParticipantTile({ p, tileSize }: { p: Participant; tileSize: number }) {
  const styles = useThemedStyles(({ COLORS }) => ({
    tile: {
      width: tileSize, height: tileSize, borderRadius: 14, overflow: 'hidden',
      backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center',
      opacity: p.joined ? 1 : 0.5,
    },
    avatar: { width: tileSize * 0.4, height: tileSize * 0.4, borderRadius: tileSize * 0.2, backgroundColor: COLORS.surfaceElevated || COLORS.background },
    name: { color: '#FFF', fontSize: 12, fontWeight: '700', position: 'absolute', bottom: 8, left: 8, textShadowColor: '#000', textShadowRadius: 4 },
    ringingLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, position: 'absolute', top: 8, left: 8 },
  }));
  return (
    <View style={styles.tile}>
      {p.videoTrack ? (
        <LiveVideoView track={p.videoTrack} muted={false} />
      ) : (
        <Image source={{ uri: `https://api.dicebear.com/7.x/avataaars/png?seed=${p.name}` }} style={styles.avatar} />
      )}
      <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
      {!p.joined && <Text style={styles.ringingLabel}>Ringing…</Text>}
    </View>
  );
}

// Group calling's counterpart to CallScreen.tsx — same signaling socket and
// LiveKit session helper, but an N-tile grid instead of a single peer view,
// and the call keeps going for whoever's still in it rather than ending the
// moment any one person leaves (see chat.gateway.ts's group_call_* handlers).
export default function GroupCallScreen({ navigation, route }: any) {
  const { callId, wsUrl, token, video, chatName, userId: myUserId } = route.params || {};
  const { socket } = useSocket();
  const { width } = useWindowDimensions();

  const [status, setStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [endReason, setEndReason] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(!!video);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [reactionTrayOpen, setReactionTrayOpen] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const sessionRef = useRef<CallSession | null>(null);
  const audioContainerRef = useRef<any>(null);
  const reactionIdRef = useRef(0);

  useEffect(() => {
    if (status !== 'connected') return;
    setElapsedSeconds(0);
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  const formatDuration = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const spawnFloatingReaction = (type: VemojiType) => {
    const id = String(reactionIdRef.current++);
    const left = 30 + Math.random() * (width - 100);
    setFloatingReactions((prev) => [...prev, { id, type, left }]);
    setTimeout(() => setFloatingReactions((prev) => prev.filter((r) => r.id !== id)), 1800);
  };

  const sendReaction = (type: VemojiType) => {
    socket?.emit('call_reaction', { callId, type });
    spawnFloatingReaction(type);
    setReactionTrayOpen(false);
  };

  // Rebuilds the participant map from LiveKit's own room state — the single
  // source of truth for who's actually publishing tracks right now. Marks a
  // participant "joined" the moment LiveKit reports them, independent of
  // (slightly earlier) group_call_participant_joined signaling.
  const syncFromRoom = () => {
    const room = sessionRef.current?.room;
    if (!room) return;
    setParticipants((prev) => {
      const next = new Map(prev);
      room.remoteParticipants.forEach((p: any) => {
        const videoPub = Array.from(p.videoTrackPublications.values())[0] as any;
        const audioPub = Array.from(p.audioTrackPublications.values())[0] as any;
        const existing = next.get(p.identity);
        next.set(p.identity, {
          userId: p.identity,
          name: p.name || existing?.name || 'Someone',
          videoTrack: videoPub?.videoTrack ?? null,
          audioTrack: audioPub?.audioTrack ?? null,
          joined: true,
        });
      });
      return next;
    });
  };

  const doConnect = async () => {
    try {
      const session = await connectToCall(
        wsUrl, token, !!video,
        () => {}, () => {}, () => {},
      );
      sessionRef.current = session;
      if (video && !session.cameraEnabled) setCamOn(false);

      const room: any = session.room;
      const onTrackEvent = (track: any) => {
        if (track?.kind === 'audio') {
          const el = track.attach();
          audioContainerRef.current?.appendChild?.(el);
        }
        syncFromRoom();
      };
      const onTrackGone = (track: any) => {
        if (track?.kind === 'audio') track.detach();
        syncFromRoom();
      };
      room.on('trackSubscribed', onTrackEvent);
      room.on('trackUnsubscribed', onTrackGone);
      room.on('participantConnected', syncFromRoom);
      room.on('participantDisconnected', syncFromRoom);
      syncFromRoom();

      setStatus('connected');
    } catch (e: any) {
      setEndReason(e.message || 'Could not connect to the call.');
      setStatus('ended');
    }
  };

  useEffect(() => {
    doConnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      sessionRef.current?.disconnect().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onParticipantJoined = (data: { callId: string; userId: string; userName: string }) => {
      if (data.callId !== callId) return;
      setParticipants((prev) => {
        const next = new Map(prev);
        const existing = next.get(data.userId);
        next.set(data.userId, existing ?? { userId: data.userId, name: data.userName, videoTrack: null, audioTrack: null, joined: true });
        return next;
      });
    };
    const onParticipantLeft = (data: { callId: string; userId: string }) => {
      if (data.callId !== callId) return;
      setParticipants((prev) => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    };
    const onEnded = (data: { callId: string; reason?: string }) => {
      if (data.callId !== callId) return;
      setEndReason('Call ended');
      setStatus('ended');
      sessionRef.current?.disconnect().catch(() => {});
    };
    const onReaction = (data: { callId: string; type: VemojiType }) => {
      if (data.callId === callId) spawnFloatingReaction(data.type);
    };

    socket.on('group_call_participant_joined', onParticipantJoined);
    socket.on('group_call_participant_left', onParticipantLeft);
    socket.on('group_call_ended', onEnded);
    socket.on('call_reaction', onReaction);
    return () => {
      socket.off('group_call_participant_joined', onParticipantJoined);
      socket.off('group_call_participant_left', onParticipantLeft);
      socket.off('group_call_ended', onEnded);
      socket.off('call_reaction', onReaction);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, callId]);

  const leaveCall = () => {
    socket?.emit('group_call_leave', { callId, userId: myUserId });
    sessionRef.current?.disconnect().catch(() => {});
    setStatus('ended');
    navigation.goBack();
  };

  const toggleMic = async () => {
    const room = sessionRef.current?.room;
    if (!room) return;
    const next = !micOn;
    await room.localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
  };

  const toggleCam = async () => {
    const room = sessionRef.current?.room;
    if (!room) return;
    const next = !camOn;
    await room.localParticipant.setCameraEnabled(next);
    setCamOn(next);
  };

  const localVideoTrack = (() => {
    const room = sessionRef.current?.room;
    if (!room || !camOn) return null;
    const pub = Array.from(room.localParticipant.videoTrackPublications.values())[0] as any;
    return pub?.videoTrack ?? null;
  })();

  const participantList = Array.from(participants.values());
  const tileCount = participantList.length + 1; // +1 for local self tile
  const columns = tileCount <= 1 ? 1 : tileCount <= 4 ? 2 : 3;
  const tileSize = Math.floor((Math.min(width, 600) - 16 * (columns + 1)) / columns);

  const styles = useThemedStyles(({ COLORS, RADIUS }) => ({
    root: { flex: 1, backgroundColor: '#0B0B14' },
    header: { paddingTop: 16, paddingBottom: 10, alignItems: 'center' },
    chatNameText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
    statusText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
    grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 16, padding: 16, justifyContent: 'center', alignContent: 'center' },
    avatarListWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    avatarRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, justifyContent: 'center', paddingHorizontal: 24 },
    avatarCell: { alignItems: 'center', gap: 6, opacity: 1 },
    avatarImg: { width: 68, height: 68, borderRadius: 34, backgroundColor: COLORS.surface },
    avatarName: { color: '#FFF', fontSize: 12, fontWeight: '600' },
    controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, paddingBottom: 50, paddingTop: 20 },
    controlBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    controlBtnOff: { backgroundColor: 'rgba(255,255,255,0.35)' },
    floatingReactionLayer: { position: 'absolute', left: 0, right: 0, bottom: 150, height: 200 },
    reactionTray: {
      position: 'absolute', bottom: 130, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    },
    reactionTrayContent: { flexDirection: 'row', gap: 10 },
    reactionTrayItem: { padding: 4 },
    hangupBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  }));

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.chatNameText}>{chatName || 'Group call'}</Text>
        <Text style={styles.statusText}>
          {status === 'connecting' ? 'Connecting…' : status === 'connected' ? `${participantList.filter(p => p.joined).length + 1} in call · ${formatDuration(elapsedSeconds)}` : (endReason || 'Call ended')}
        </Text>
      </View>

      {video ? (
        <View style={styles.grid}>
          <ParticipantTile p={{ userId: myUserId, name: 'You', videoTrack: localVideoTrack, audioTrack: null, joined: true }} tileSize={tileSize} />
          {participantList.map((p) => (
            <ParticipantTile key={p.userId} p={p} tileSize={tileSize} />
          ))}
        </View>
      ) : (
        <View style={styles.avatarListWrap}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarCell}>
              <Image source={{ uri: `https://api.dicebear.com/7.x/avataaars/png?seed=you` }} style={styles.avatarImg} />
              <Text style={styles.avatarName}>You</Text>
            </View>
            {participantList.map((p) => (
              <View key={p.userId} style={[styles.avatarCell, { opacity: p.joined ? 1 : 0.5 }]}>
                <Image source={{ uri: `https://api.dicebear.com/7.x/avataaars/png?seed=${p.name}` }} style={styles.avatarImg} />
                <Text style={styles.avatarName}>{p.joined ? p.name : `${p.name} (ringing…)`}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <AudioContainer ref={audioContainerRef} style={{ width: 0, height: 0, overflow: 'hidden' }} />

      <View style={styles.floatingReactionLayer} pointerEvents="none">
        {floatingReactions.map((r) => <FloatingVemoji key={r.id} type={r.type} left={r.left} />)}
      </View>

      {reactionTrayOpen && (
        <View style={[styles.reactionTray, { maxWidth: width - 32 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reactionTrayContent}>
            {VEMOJI_CATALOG.map((v) => (
              <TouchableOpacity key={v.type} style={styles.reactionTrayItem} onPress={() => sendReaction(v.type)}>
                <CustomEmoji type={v.type} size={36} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.controls}>
        <TouchableOpacity style={[styles.controlBtn, reactionTrayOpen && styles.controlBtnOff]} onPress={() => setReactionTrayOpen((v) => !v)} disabled={status !== 'connected'}>
          <Ionicons name="happy-outline" size={24} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlBtn, !micOn && styles.controlBtnOff]} onPress={toggleMic} disabled={status !== 'connected'}>
          <Ionicons name={micOn ? 'mic' : 'mic-off'} size={24} color="#FFF" />
        </TouchableOpacity>
        {video && (
          <TouchableOpacity style={[styles.controlBtn, !camOn && styles.controlBtnOff]} onPress={toggleCam} disabled={status !== 'connected'}>
            <Ionicons name={camOn ? 'videocam' : 'videocam-off'} size={24} color="#FFF" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.hangupBtn} onPress={leaveCall}>
          <Ionicons name="call" size={26} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
