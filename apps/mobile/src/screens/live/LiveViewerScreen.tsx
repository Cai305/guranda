import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  Image, Alert, Share, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, BRAND } from '../../theme';
import { LiveStream, categoryOf } from '../../data/mockLiveStreams';
import { RealLiveStream, joinRoom } from '../../data/liveApi';
import { formatCount } from '../../utils/format';
import LiveVideoView from '../../components/LiveVideoView';
import * as LiveKit from '../../live/liveKit';
import { useLiveSocket, LiveSpecialMessagePayload } from '../../live/useLiveSocket';
import { useAuth } from '../../context/AuthContext';
import { useLiveSound, LiveSoundType, LIVE_SOUND_DURATION_MS } from '../../live/useLiveSound';
import GiftSheet from '../../components/gifts/GiftSheet';
import GiftToast from '../../components/gifts/GiftToast';
import CustomEmoji from '../../components/live/CustomEmoji';
import EmojiBurstOverlay from '../../components/live/EmojiBurstOverlay';
import GifPicker from '../../components/live/GifPicker';
import SessionHeaderActions from '../../components/SessionHeaderActions';
import { GRADIENTS } from '../../theme';

const INITIAL_CHAT = [
  { id: 'c1', senderName: 'Zanele_K', text: 'this is so good 🔥', msgType: 'text' as const },
  { id: 'c2', senderName: 'Mo_dev', text: 'joining from Cape Town 👋', msgType: 'text' as const },
  { id: 'c3', senderName: 'ThaboM', text: 'been waiting for this all week', msgType: 'text' as const },
];

const CUSTOM_EMOJIS: { type: LiveSoundType; label: string; chatEmoji: string }[] = [
  { type: 'laugh', label: 'HAHA', chatEmoji: '😹' },
  { type: 'cry', label: 'CRYING', chatEmoji: '😢' },
  { type: 'fire', label: 'FIRE', chatEmoji: '🔥' },
  { type: 'clap', label: 'CLAP', chatEmoji: '👏' },
  { type: 'love', label: 'LOVE', chatEmoji: '❤️' },
  { type: 'shocked', label: 'WOW', chatEmoji: '😱' },
  { type: 'blush', label: 'BLUSH', chatEmoji: '😊' },
  { type: 'inlove', label: 'IN LOVE', chatEmoji: '😍' },
];

export default function LiveViewerScreen({ navigation, route }: any) {
  const stream: LiveStream = route?.params?.stream;
  const category = categoryOf(stream);
  const isRealStream = !!(stream as any)?.real;
  const realStream = stream as RealLiveStream;
  const { user } = useAuth();
  const { playSound } = useLiveSound();

  const [following, setFollowing] = useState(false);
  const [chat, setChat] = useState(INITIAL_CHAT as any[]);
  const [message, setMessage] = useState('');
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({
    '❤️': 214, '🔥': 98, '😂': 40, '👏': 65, '😮': 12,
  });
  const [giftSheetOpen, setGiftSheetOpen] = useState(false);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [emojiTrayOpen, setEmojiTrayOpen] = useState(false);
  const [emojiBurst, setEmojiBurst] = useState<{ type: LiveSoundType; nonce: number } | null>(null);
  const chatRef = useRef<ScrollView>(null);

  const myName = user?.displayName || user?.username || 'Guest';
  const actualRoomName = isRealStream ? realStream.roomName : `mock-room-${stream.id}`;

  const {
    messages: liveMessages,
    sendMessage: sendLiveMessage,
    sendSpecialMessage,
    sendReaction: sendLiveReaction,
    lastReaction,
    lastGift,
    lastSpecialMsg,
    roomEnded,
    raisedHands,
    speakers,
    sendAudioRoomEvent,
  } = useLiveSocket(actualRoomName, myName);

  const [remoteVideoTrack, setRemoteVideoTrack] = useState<any>(null);
  const [liveParticipantCount, setLiveParticipantCount] = useState<number | null>(null);
  const viewerSessionRef = useRef<any>(null);

  useEffect(() => {
    if (!isRealStream || Platform.OS !== 'web') return;
    let cancelled = false;
    joinRoom(realStream.roomId)
      .then(({ token, wsUrl }) =>
        LiveKit.connectAsViewer(wsUrl, token, (track: any) => !cancelled && setRemoteVideoTrack(track), (n: number) => !cancelled && setLiveParticipantCount(n)))
      .then((session: any) => {
        if (cancelled) { session.disconnect(); return; }
        viewerSessionRef.current = session;
      })
      .catch(() => {});
    return () => { cancelled = true; viewerSessionRef.current?.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRealStream, realStream?.roomId]);

  useEffect(() => {
    if (!lastReaction) return;
    setReactionCounts(prev => ({ ...prev, [lastReaction.emoji]: (prev[lastReaction.emoji] ?? 0) + 1 }));
  }, [lastReaction]);

  // Play sound + shower the whole screen with the reaction on any special
  // emoji message — this fires for the sender too (the room broadcast
  // echoes back), so one trigger point covers both directions.
  useEffect(() => {
    if (!lastSpecialMsg || lastSpecialMsg.msgType !== 'emoji' || !lastSpecialMsg.emojiType) return;
    playSound(lastSpecialMsg.emojiType);
    setEmojiBurst({ type: lastSpecialMsg.emojiType, nonce: Date.now() });
  }, [lastSpecialMsg]);

  useEffect(() => {
    if (!roomEnded) return;
    viewerSessionRef.current?.disconnect();
    Alert.alert('Stream ended', `${stream.creator.name} has ended this live stream.`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  }, [roomEnded]);

  // Hooks below must stay above the `if (!stream) return null` guard —
  // conditionally skipping them would change the hook call order between
  // renders (react-hooks/rules-of-hooks), which is undefined behavior.
  const [muted, setMuted] = useState(true);
  const mySpeakerState = speakers[myName];
  const isSpeaker = mySpeakerState && mySpeakerState.timerEnd > Date.now();
  const hasRaisedHand = raisedHands.includes(myName);

  useEffect(() => { if (!isSpeaker && !muted) setMuted(true); }, [isSpeaker, muted]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!isSpeaker) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isSpeaker]);

  const lastTapRef = useRef<number>(0);

  if (!stream) return null;

  const displayChat = isRealStream
    ? liveMessages.map(m => ({ ...m, user: m.senderName }))
    : chat.map(m => ({ ...m, user: m.senderName }));
  const displayViewers = isRealStream && liveParticipantCount !== null ? liveParticipantCount : stream.viewers;

  const sendMessage = () => {
    if (!message.trim()) return;
    if (isRealStream) {
      sendLiveMessage(message.trim());
    } else {
      setChat(prev => [...prev, { id: `local-${Date.now()}`, senderName: 'You', text: message.trim(), msgType: 'text' }]);
    }
    setMessage('');
    setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const sendCustomEmoji = (emojiType: LiveSoundType) => {
    const preset = CUSTOM_EMOJIS.find(e => e.type === emojiType)!;
    const msg: LiveSpecialMessagePayload = {
      text: `${preset.label} ${preset.chatEmoji}`,
      msgType: 'emoji',
      emojiType,
    };
    if (isRealStream) {
      sendSpecialMessage(msg);
    } else {
      setChat(prev => [...prev, { id: `local-${Date.now()}`, senderName: 'You', ...msg }]);
      playSound(emojiType);
      setEmojiBurst({ type: emojiType, nonce: Date.now() });
    }
    setEmojiTrayOpen(false);
    setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const sendGif = (gifUrl: string) => {
    const msg: LiveSpecialMessagePayload = { msgType: 'gif', gifUrl };
    if (isRealStream) {
      sendSpecialMessage(msg);
    } else {
      setChat(prev => [...prev, { id: `local-${Date.now()}`, senderName: 'You', text: '', ...msg }]);
    }
    setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const react = (emoji: string) => {
    if (isRealStream) sendLiveReaction(emoji);
    else setReactionCounts(prev => ({ ...prev, [emoji]: prev[emoji] + 1 }));
  };

  const toggleHand = () => {
    if (hasRaisedHand) sendAudioRoomEvent('lower_hand', { username: myName });
    else sendAudioRoomEvent('raise_hand', { username: myName });
  };
  const toggleMic = () => { if (isSpeaker) setMuted(!muted); };

  const handleDoubleTap = () => {
    const tapNow = Date.now();
    if (tapNow - lastTapRef.current < 300) react('❤️');
    lastTapRef.current = tapNow;
  };

  const shareStream = async () => {
    try {
      await Share.share({ message: `Watch "${stream.title}" live on ${BRAND.name}!`, title: stream.title });
    } catch (e: any) { Alert.alert('Error sharing stream', e.message); }
  };

  if (roomEnded) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.endedWrap}>
          <Ionicons name="radio-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.endedTitle}>Stream ended</Text>
          <Text style={styles.endedBody}>{stream.creator.name} has ended this live stream.</Text>
          <TouchableOpacity style={styles.endedBackBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.endedBackBtnText}>Back to Live</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Full-screen background */}
      {isRealStream && remoteVideoTrack ? (
        <View style={StyleSheet.absoluteFill}>
          <LiveVideoView track={remoteVideoTrack} />
        </View>
      ) : (
        <LinearGradient
          colors={category?.gradient || ['#333', '#111']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Top scrim */}
      <LinearGradient
        colors={['rgba(0,0,0,0.65)', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120 }}
        pointerEvents="none"
      />
      {/* Bottom scrim */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 400 }}
        pointerEvents="none"
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Top header */}
        <View style={styles.topHeader}>
          <SessionHeaderActions
            navigation={navigation}
            session={{
              id: 'live-viewer',
              label: stream?.creator?.name ? `${stream.creator.name}'s stream` : 'Live stream',
              icon: 'radio',
              gradient: GRADIENTS.crimson,
              route: { name: 'LiveViewer', params: { stream } },
            }}
          />
          <View style={styles.videoBadges}>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.livePillText}>LIVE</Text>
            </View>
            <View style={styles.viewersPill}>
              <Ionicons name="eye" size={12} color="#FFF" />
              <Text style={styles.viewersText}>{formatCount(displayViewers)}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.circleBtn} onPress={shareStream}>
            <Ionicons name="share-social-outline" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Creator info */}
        <View style={styles.creatorBarOverlay}>
          <Image
            source={{ uri: `https://api.dicebear.com/7.x/avataaars/png?seed=${stream.creator.avatarSeed}` }}
            style={styles.avatar}
          />
          <View style={{ flex: 1 }}>
            <View style={styles.creatorNameRow}>
              <Text style={styles.creatorNameOverlay}>{stream.creator.name}</Text>
              {stream.creator.verified && <Ionicons name="checkmark-circle" size={14} color={COLORS.secondary} />}
            </View>
          </View>
          <TouchableOpacity
            style={[styles.followBtn, following && styles.followBtnActive]}
            onPress={() => setFollowing(f => !f)}
          >
            <Text style={[styles.followBtnText, following && styles.followBtnTextActive]}>
              {following ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        </View>

        {lastGift && (
          <View style={styles.giftToastWrap}>
            <GiftToast icon={lastGift.icon} label={lastGift.label} senderName={lastGift.senderName} nonce={lastGift.nonce} />
          </View>
        )}

        <EmojiBurstOverlay
          type={emojiBurst?.type ?? null}
          nonce={emojiBurst?.nonce ?? 0}
          durationMs={LIVE_SOUND_DURATION_MS}
        />

        {/* Tap area — double-tap to like */}
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleDoubleTap} />

        {/* Bottom overlay: chat + floating actions */}
        <View style={styles.bottomOverlayArea}>
          <View style={styles.chatOverlayContainer}>
            <ScrollView
              ref={chatRef}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ justifyContent: 'flex-end', flexGrow: 1 }}
            >
              {displayChat.map((m: any) => (
                <View key={m.id} style={styles.chatMessageBubble}>
                  <Text style={styles.chatUser}>{m.senderName} </Text>
                  {m.msgType === 'emoji' && m.emojiType ? (
                    <CustomEmoji type={m.emojiType} size={28} />
                  ) : m.msgType === 'gif' && m.gifUrl ? (
                    <Image source={{ uri: m.gifUrl }} style={styles.chatGif} resizeMode="cover" />
                  ) : (
                    <Text style={styles.chatLine}>{m.text}</Text>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Floating actions */}
          <View style={styles.floatingActions}>
            <View style={styles.floatingBtnWrap}>
              <TouchableOpacity style={styles.floatingBtn} onPress={() => react('❤️')}>
                <Text style={styles.floatingBtnEmoji}>❤️</Text>
              </TouchableOpacity>
              <Text style={styles.floatingBtnLabel}>{formatCount(reactionCounts['❤️'])}</Text>
            </View>
            <View style={styles.floatingBtnWrap}>
              <TouchableOpacity style={styles.floatingBtn} onPress={() => setGiftSheetOpen(true)}>
                <Ionicons name="gift" size={24} color={COLORS.warning} />
              </TouchableOpacity>
              <Text style={styles.floatingBtnLabel}>Gift</Text>
            </View>
            <View style={styles.floatingBtnWrap}>
              <TouchableOpacity
                style={[styles.floatingBtn, (hasRaisedHand || isSpeaker) && { backgroundColor: 'rgba(59,130,246,0.5)' }]}
                onPress={isSpeaker ? toggleMic : toggleHand}
              >
                <Ionicons
                  name={isSpeaker ? (muted ? 'mic-off' : 'mic') : (hasRaisedHand ? 'hand-right' : 'hand-right-outline')}
                  size={24}
                  color="#FFF"
                />
              </TouchableOpacity>
              <Text style={styles.floatingBtnLabel}>
                {isSpeaker && mySpeakerState ? `${Math.max(0, Math.floor((mySpeakerState.timerEnd - now) / 1000))}s` : 'Speak'}
              </Text>
            </View>
          </View>
        </View>

        {/* Custom Emoji Tray */}
        {emojiTrayOpen && (
          <View style={styles.emojiTray}>
            {CUSTOM_EMOJIS.map(e => (
              <TouchableOpacity key={e.type} style={styles.emojiTrayItem} onPress={() => sendCustomEmoji(e.type)}>
                <CustomEmoji type={e.type} size={44} />
                <Text style={styles.emojiTrayLabel}>{e.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Chat Input Row */}
        <View style={styles.chatInputOverlayRow}>
          {/* Emoji tray toggle */}
          <TouchableOpacity
            style={[styles.inputIconBtn, emojiTrayOpen && { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            onPress={() => { setEmojiTrayOpen(o => !o); setGifPickerOpen(false); }}
          >
            <Text style={{ fontSize: 20 }}>😹</Text>
          </TouchableOpacity>

          {/* GIF button */}
          <TouchableOpacity
            style={styles.gifBtn}
            onPress={() => { setGifPickerOpen(true); setEmojiTrayOpen(false); }}
          >
            <Text style={styles.gifBtnText}>GIF</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.chatInputOverlay}
            placeholder="Add a comment..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={message}
            onChangeText={setMessage}
            onSubmitEditing={sendMessage}
            onFocus={() => { setEmojiTrayOpen(false); }}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
            <Ionicons name="send" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>

      {/* GIF Picker Modal */}
      <GifPicker
        visible={gifPickerOpen}
        onClose={() => setGifPickerOpen(false)}
        onSelect={sendGif}
      />

      {isRealStream && (
        <GiftSheet
          visible={giftSheetOpen}
          onClose={() => setGiftSheetOpen(false)}
          recipientId={stream.creator.id}
          recipientName={stream.creator.name}
          context="live"
          contextId={realStream.roomName}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  endedWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, gap: SPACING.sm },
  endedTitle: { ...TYPOGRAPHY.h2, marginTop: SPACING.md },
  endedBody: { ...TYPOGRAPHY.body2, textAlign: 'center' },
  endedBackBtn: { marginTop: SPACING.lg, backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: RADIUS.pill },
  endedBackBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.md, paddingTop: SPACING.md },
  circleBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  videoBadges: { flexDirection: 'row', gap: 8 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF3B30' },
  livePillText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  viewersPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 4 },
  viewersText: { color: '#FFF', fontSize: 11, fontWeight: '700' },

  creatorBarOverlay: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.md, marginTop: SPACING.sm },
  avatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: '#FFF' },
  creatorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  creatorNameOverlay: { color: '#FFF', fontSize: 15, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  followBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.pill },
  followBtnActive: { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  followBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  followBtnTextActive: { color: '#FFF' },

  giftToastWrap: { position: 'absolute', top: 100, left: 0, right: 0, alignItems: 'center' },

  bottomOverlayArea: { flexDirection: 'row', paddingHorizontal: SPACING.md, marginBottom: SPACING.sm, alignItems: 'flex-end', minHeight: 200 },
  chatOverlayContainer: { flex: 1, maxHeight: 200, marginRight: SPACING.md },
  chatMessageBubble: { backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 6, alignSelf: 'flex-start', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', maxWidth: '90%' },
  chatUser: { color: COLORS.secondary, fontWeight: '700', fontSize: 13 },
  chatLine: { color: '#FFF', fontSize: 13, lineHeight: 18, flex: 1 },
  chatGif: { width: 140, height: 100, borderRadius: RADIUS.sm, marginTop: 4 },

  // Emoji tray
  emojiTray: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.lg, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: RADIUS.lg, marginHorizontal: SPACING.md, marginBottom: SPACING.sm, maxWidth: '85%', alignSelf: 'flex-start' },
  emojiTrayItem: { alignItems: 'center', gap: 4 },
  emojiTrayLabel: { color: '#FFF', fontSize: 10, fontWeight: '700' },

  // Chat input
  chatInputOverlayRow: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, alignItems: 'center' },
  inputIconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  gifBtn: { backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 6, justifyContent: 'center', alignItems: 'center' },
  gifBtnText: { color: '#FFF', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  chatInputOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.pill, paddingHorizontal: 16, paddingVertical: 10, color: '#FFF' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },

  floatingActions: { alignItems: 'center', gap: SPACING.lg, paddingBottom: SPACING.sm },
  floatingBtnWrap: { alignItems: 'center', gap: 4 },
  floatingBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  floatingBtnEmoji: { fontSize: 22 },
  floatingBtnLabel: { color: '#FFF', fontSize: 11, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
});
