import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useSocket } from '../../context/SocketContext';
import LiveVideoView from '../../components/LiveVideoView';
import CustomEmoji from '../../components/live/CustomEmoji';
import { connectToCall, CallSession } from '../../live/liveCall';
import { VEMOJI_CATALOG, VemojiType } from '@mxit2/types';

const AudioTag: any = Platform.OS === 'web' ? 'audio' : View;

interface FloatingReaction {
  id: string;
  type: VemojiType;
  left: number;
}

// A Vemoji reaction sent during an active call — floats up from the bottom
// and fades out, same "in-call Tapback" feel as the live-stream emoji tray,
// scoped down to a single instance instead of a whole chat feed.
function FloatingVemoji({ type, left }: { type: VemojiType; left: number }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const styles = useThemedStyles(() => ({
    floatingVemoji: { position: 'absolute', bottom: 0 },
  }));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -180, duration: 1700, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 1700, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.floatingVemoji, { left, opacity, transform: [{ translateY }] }]} pointerEvents="none">
      <CustomEmoji type={type} size={48} />
    </Animated.View>
  );
}

// The other side of a ring/accept: this screen is reached two ways —
// (a) the caller, immediately after call_ringing, showing "Calling..." until
//     call_accepted arrives, or
// (b) the callee, immediately after tapping Accept in IncomingCallOverlay,
//     already holding a token and connecting right away for lower latency.
export default function CallScreen({ navigation, route }: any) {
  const { callId, wsUrl, token, video, peerName, isCaller } = route.params || {};
  const { socket } = useSocket();

  const [status, setStatus] = useState<'ringing' | 'connecting' | 'connected' | 'ended'>(
    isCaller ? 'ringing' : 'connecting',
  );
  const [endReason, setEndReason] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(!!video);
  const [remoteVideoTrack, setRemoteVideoTrack] = useState<any>(null);
  const [remoteAudioTrack, setRemoteAudioTrack] = useState<any>(null);
  const [reactionTrayOpen, setReactionTrayOpen] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const sessionRef = useRef<CallSession | null>(null);
  const audioRef = useRef<any>(null);
  const reactionIdRef = useRef(0);

  const spawnFloatingReaction = (type: VemojiType) => {
    const id = String(reactionIdRef.current++);
    const left = 30 + Math.random() * 200;
    setFloatingReactions(prev => [...prev, { id, type, left }]);
    setTimeout(() => setFloatingReactions(prev => prev.filter(r => r.id !== id)), 1800);
  };

  const sendReaction = (type: VemojiType) => {
    socket?.emit('call_reaction', { callId, type });
    spawnFloatingReaction(type);
    setReactionTrayOpen(false);
  };

  const doConnect = async () => {
    try {
      setStatus('connecting');
      const session = await connectToCall(
        wsUrl, token, !!video,
        (track) => setRemoteVideoTrack(track),
        (track) => setRemoteAudioTrack(track),
        () => endCall(),
      );
      sessionRef.current = session;
      if (video && !session.cameraEnabled) setCamOn(false);
      setStatus('connected');
    } catch (e: any) {
      setEndReason(e.message || 'Could not connect to the call.');
      setStatus('ended');
    }
  };

  useEffect(() => {
    // Callee connects immediately (already accepted locally); caller waits
    // for the server's call_accepted push before joining the LiveKit room.
    if (!isCaller) doConnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onAccepted = (data: { callId: string }) => {
      if (data.callId === callId && isCaller) doConnect();
    };
    const onEnded = (data: { callId: string; reason?: string }) => {
      if (data.callId !== callId) return;
      setEndReason(data.reason === 'declined' ? 'Call declined' : data.reason === 'missed' ? 'No answer' : 'Call ended');
      setStatus('ended');
      sessionRef.current?.disconnect().catch(() => {});
    };
    socket.on('call_accepted', onAccepted);
    socket.on('call_ended', onEnded);
    return () => {
      socket.off('call_accepted', onAccepted);
      socket.off('call_ended', onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, callId, isCaller]);

  useEffect(() => {
    if (!socket) return;
    const onReaction = (data: { callId: string; type: VemojiType }) => {
      if (data.callId === callId) spawnFloatingReaction(data.type);
    };
    socket.on('call_reaction', onReaction);
    return () => { socket.off('call_reaction', onReaction); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, callId]);

  useEffect(() => {
    if (audioRef.current && remoteAudioTrack) {
      remoteAudioTrack.attach(audioRef.current);
      return () => remoteAudioTrack.detach(audioRef.current);
    }
  }, [remoteAudioTrack]);

  useEffect(() => {
    return () => {
      sessionRef.current?.disconnect().catch(() => {});
    };
  }, []);

  const endCall = () => {
    socket?.emit('call_end', { callId });
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

  return (
    <SafeAreaView style={styles.root}>
      {video && remoteVideoTrack ? (
        <LiveVideoView track={remoteVideoTrack} muted={false} />
      ) : (
        <View style={styles.avatarWrap}>
          <Image source={{ uri: `https://api.dicebear.com/7.x/avataaars/png?seed=${peerName}` }} style={styles.avatar} />
          <Text style={styles.peerName}>{peerName}</Text>
          <Text style={styles.statusText}>
            {status === 'ringing' ? 'Calling…' : status === 'connecting' ? 'Connecting…' : status === 'connected' ? (video ? 'Camera off' : 'Voice call') : endReason || 'Call ended'}
          </Text>
        </View>
      )}

      {video && camOn && localVideoTrack && (
        <View style={styles.pip}>
          <LiveVideoView track={localVideoTrack} muted mirror />
        </View>
      )}

      {video && (
        <View style={styles.topOverlay} pointerEvents="none">
          <Text style={styles.peerNameOverlay}>{peerName}</Text>
          <Text style={styles.statusTextOverlay}>
            {status === 'ringing' ? 'Calling…' : status === 'connecting' ? 'Connecting…' : status === 'connected' ? '' : endReason || 'Call ended'}
          </Text>
        </View>
      )}

      <AudioTag ref={audioRef} autoPlay />

      <View style={styles.floatingReactionLayer} pointerEvents="none">
        {floatingReactions.map(r => <FloatingVemoji key={r.id} type={r.type} left={r.left} />)}
      </View>

      {reactionTrayOpen && (
        <View style={styles.reactionTray}>
          {VEMOJI_CATALOG.map(v => (
            <TouchableOpacity key={v.type} style={styles.reactionTrayItem} onPress={() => sendReaction(v.type)}>
              <CustomEmoji type={v.type} size={36} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlBtn, reactionTrayOpen && styles.controlBtnOff]}
          onPress={() => setReactionTrayOpen(v => !v)}
          disabled={status !== 'connected'}
        >
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
        <TouchableOpacity style={styles.hangupBtn} onPress={() => endCall()}>
          <Ionicons name="call" size={26} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

