import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  Image, Alert, Share, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, BRAND } from '../../theme';
import { LiveStream, categoryOf } from '../../data/mockLiveStreams';
import { RealLiveStream, joinRoom, getMyGuestInvite, respondGuestInvite } from '../../data/liveApi';
import { formatCount } from '../../utils/format';
import LiveGuestGrid, { VideoTile } from '../../components/live/LiveGuestGrid';
import * as LiveKit from '../../live/liveKit';
import { useLiveSocket, LiveSpecialMessagePayload } from '../../live/useLiveSocket';
import { useAuth } from '../../context/AuthContext';
import { useLiveSound, LiveSoundType, LIVE_SOUND_DURATION_MS } from '../../live/useLiveSound';
import { fetchApi } from '../../utils/api';
import GiftSheet from '../../components/gifts/GiftSheet';
import GiftToast from '../../components/gifts/GiftToast';
import CustomEmoji from '../../components/live/CustomEmoji';
import EmojiBurstOverlay from '../../components/live/EmojiBurstOverlay';
import GifPicker from '../../components/live/GifPicker';
import SessionHeaderActions from '../../components/SessionHeaderActions';
import LiveCategoryViewerPanel from '../../components/live/LiveCategoryViewerPanel';
import { GRADIENTS } from '../../theme';
import * as modApi from '../../data/liveCategoryApi';
import { reportLiveStream } from '../../data/liveCategoryApi';

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

interface Props {
  stream: LiveStream;
  navigation: any;
  // Only the page currently swiped into view connects its socket/video —
  // every other page in the feed stays fully inert (no room join, no
  // LiveKit connection), the same isActive-gating pattern PostMediaCarousel
  // already uses for off-screen video. Without this, swiping past N streams
  // would leave N sockets and N WebRTC sessions open at once.
  isActive: boolean;
}

export default function LiveStreamPage({ stream, navigation, isActive }: Props) {
  const category = categoryOf(stream);
  const isRealStream = !!(stream as any)?.real;
  const realStream = stream as RealLiveStream;
  const { user } = useAuth();
  const { playSound } = useLiveSound();

  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
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
  const isOwnStream = isRealStream && stream?.creator?.id === user?.userId;

  const {
    messages: liveMessages,
    sendMessage: sendLiveMessage,
    sendSpecialMessage,
    deleteMessage,
    sendReaction: sendLiveReaction,
    lastReaction,
    lastGift,
    lastSpecialMsg,
    roomEnded,
    kicked,
    participants,
    raisedHands,
    speakers,
    sendAudioRoomEvent,
    categoryEvent,
  } = useLiveSocket(isActive ? actualRoomName : undefined, myName, user?.userId);

  // Real follow state — was previously local-only (useState(false), never
  // persisted). Seeded from the same /follow-stats endpoint UserProfileScreen
  // uses, only once this page is actually the one swiped into view.
  useEffect(() => {
    if (!isActive || !stream?.creator?.id || isOwnStream) return;
    fetchApi(`/users/${stream.creator.id}/follow-stats`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setFollowing(!!data.isFollowedByMe);
        setFollowerCount(typeof data.followerCount === 'number' ? data.followerCount : null);
      })
      .catch(() => {});
  }, [isActive, stream?.creator?.id, isOwnStream]);

  const toggleFollow = async () => {
    if (followLoading || !stream?.creator?.id) return;
    setFollowLoading(true);
    const wasFollowing = following;
    // Optimistic — matches UserProfileScreen's handleFollow pattern.
    setFollowing(!wasFollowing);
    setFollowerCount((c) => (c === null ? c : c + (wasFollowing ? -1 : 1)));
    try {
      const res = await fetchApi(`/users/${stream.creator.id}/follow`, { method: 'POST' });
      if (!res.ok) throw new Error('Could not update follow status');
    } catch (e: any) {
      setFollowing(wasFollowing);
      setFollowerCount((c) => (c === null ? c : c + (wasFollowing ? 1 : -1)));
      Alert.alert('Error', e.message || 'Could not update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  // Moderation: am I the host or a moderator of this stream? Drives the
  // delete-message affordance on chat bubbles and the compact moderator
  // action panel below (for assigned moderators — the host's full panel
  // lives in LiveHostScreen).
  const [modState, setModState] = useState<{ moderators: any[]; muted: any[]; banned: any[] } | null>(null);
  const [modPanelOpen, setModPanelOpen] = useState(false);
  const isHost = isRealStream && stream?.creator?.id === user?.userId;
  const loadModState = () => {
    if (!isRealStream || !realStream.roomId) return;
    modApi.getModerationState(realStream.roomId).then(setModState).catch(() => setModState(null));
  };
  useEffect(() => { if (isActive) loadModState(); }, [isActive, isRealStream, realStream?.roomId]);
  useEffect(() => { if (isActive && categoryEvent?.type === 'live_moderation_update') loadModState(); }, [categoryEvent?.nonce]);
  useEffect(() => { if (isActive && categoryEvent?.type === 'live_guest_update') loadMyInvite(); }, [categoryEvent?.nonce]);
  const isModerator = !!modState && (isHost || modState.moderators.some((m) => m.userId === user?.userId));
  const canModerate = isModerator;
  const runMod = (fn: () => Promise<any>) => fn().then(loadModState).catch((e: any) => Alert.alert('Error', e.message));

  useEffect(() => {
    if (!kicked) return;
    Alert.alert(
      kicked === 'banned' ? 'Removed' : 'Removed',
      kicked === 'banned'
        ? 'The host has banned you from this stream.'
        : 'The host has removed you from this stream.',
      [{ text: 'OK', onPress: () => navigation.goBack() }],
    );
  }, [kicked]);

  const [remoteVideos, setRemoteVideos] = useState<Record<string, { name: string; track: any }>>({});
  const [liveParticipantCount, setLiveParticipantCount] = useState<number | null>(null);
  const viewerSessionRef = useRef<any>(null);

  const onRemoteVideoTrack = (identity: string, name: string, track: any) => {
    setRemoteVideos(prev => {
      if (!track) {
        const next = { ...prev };
        delete next[identity];
        return next;
      }
      return { ...prev, [identity]: { name, track } };
    });
  };

  const connectViewer = (token: string, wsUrl: string, cancelledRef: { current: boolean }) =>
    LiveKit.connectAsViewer(
      wsUrl, token,
      (identity: string, name: string, track: any) => !cancelledRef.current && onRemoteVideoTrack(identity, name, track),
      (n: number) => !cancelledRef.current && setLiveParticipantCount(n),
    ).then((session: any) => {
      if (cancelledRef.current) { session.disconnect(); return; }
      viewerSessionRef.current = session;
    });

  useEffect(() => {
    if (!isActive || !isRealStream || Platform.OS !== 'web') return;
    const cancelledRef = { current: false };
    joinRoom(realStream.roomId)
      .then(({ token, wsUrl }) => connectViewer(token, wsUrl, cancelledRef))
      .catch(() => {});
    return () => { cancelledRef.current = true; viewerSessionRef.current?.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isRealStream, realStream?.roomId]);

  // ── Multi-guest streaming: "you're invited to go on stage" ──────────────
  const [myInviteStatus, setMyInviteStatus] = useState<'INVITED' | 'ACCEPTED' | 'DECLINED' | 'REMOVED' | null>(null);
  const [respondingInvite, setRespondingInvite] = useState(false);
  const [myLocalVideoTrack, setMyLocalVideoTrack] = useState<any>(null);

  const loadMyInvite = () => {
    if (!isActive || !isRealStream || Platform.OS !== 'web' || !realStream?.roomId) return;
    getMyGuestInvite(realStream.roomId).then((invite) => setMyInviteStatus(invite?.status ?? null)).catch(() => {});
  };
  useEffect(() => { loadMyInvite(); }, [isActive, isRealStream, realStream?.roomId]);

  const acceptGuestInvite = async () => {
    if (!realStream?.roomId) return;
    setRespondingInvite(true);
    try {
      await respondGuestInvite(realStream.roomId, true);
      // A fresh, publish-capable token is required — LiveKit grants
      // canPublish at connection time from the JWT, so the existing
      // subscribe-only session has to be torn down and reconnected.
      viewerSessionRef.current?.disconnect();
      const { token, wsUrl } = await joinRoom(realStream.roomId);
      const cancelledRef = { current: false };
      await connectViewer(token, wsUrl, cancelledRef);
      const localTrack = await LiveKit.becomeGuestPublisher(viewerSessionRef.current.room);
      setMyLocalVideoTrack(localTrack);
      setMyInviteStatus('ACCEPTED');
    } catch (e: any) {
      Alert.alert('Could not join as a guest', e.message || 'Please try again.');
    } finally {
      setRespondingInvite(false);
    }
  };

  const declineGuestInvite = async () => {
    if (!realStream?.roomId) return;
    setRespondingInvite(true);
    try {
      await respondGuestInvite(realStream.roomId, false);
      setMyInviteStatus('DECLINED');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setRespondingInvite(false);
    }
  };

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
  const [heartBurstNonce, setHeartBurstNonce] = useState(0);

  if (!stream) return null;

  const displayChat = isRealStream
    ? liveMessages.map(m => ({ ...m, user: m.senderName }))
    : chat.map(m => ({ ...m, user: m.senderName }));
  const displayViewers = isRealStream && liveParticipantCount !== null ? liveParticipantCount : stream.viewers;
  // TikTok-style comment feed only shows the last handful without scrolling
  // — the full history is still there via scroll, this just keeps the tail
  // from growing into a wall of text over a long stream.
  const recentChat = displayChat.slice(-30);

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
    if (tapNow - lastTapRef.current < 300) {
      react('❤️');
      setHeartBurstNonce((n) => n + 1);
    }
    lastTapRef.current = tapNow;
  };

  const shareStream = async () => {
    try {
      await Share.share({ message: `Watch "${stream.title}" live on ${BRAND.name}!`, title: stream.title });
    } catch (e: any) { Alert.alert('Error sharing stream', e.message); }
  };

  const reportStream = () => {
    if (!isRealStream || !realStream.roomId) return;
    Alert.alert(
      'Report Stream',
      'Why are you reporting this stream?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Harassment', onPress: () => submitReport('harassment') },
        { text: 'Inappropriate Content', onPress: () => submitReport('inappropriate_content') },
        { text: 'Spam', onPress: () => submitReport('spam') },
        { text: 'Violence', onPress: () => submitReport('violence') },
        { text: 'Hate Speech', onPress: () => submitReport('hate_speech') },
        { text: 'Other', onPress: () => submitReport('other') },
      ]
    );
  };

  const submitReport = async (reason: string) => {
    if (!isRealStream || !realStream.roomId) return;
    try {
      await reportLiveStream(realStream.roomId, stream.creator.id, reason);
      Alert.alert('Report submitted', 'Our team will review this stream shortly.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not submit report.');
    }
  };

  if (roomEnded) {
    return (
      <View style={styles.container}>
        <View style={styles.endedWrap}>
          <Ionicons name="radio-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.endedTitle}>Stream ended</Text>
          <Text style={styles.endedBody}>{stream.creator.name} has ended this live stream.</Text>
          <TouchableOpacity style={styles.endedBackBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.endedBackBtnText}>Back to Live</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Full-screen background — the host's feed plus any other guests on
          stage, laid out as a grid; my own tile joins in once I've accepted
          a guest invite and started publishing. */}
      {isRealStream && (Object.keys(remoteVideos).length > 0 || myLocalVideoTrack) ? (
        <LiveGuestGrid
          tiles={[
            ...Object.entries(remoteVideos).map(([identity, v]) => ({ identity, name: v.name, track: v.track } as VideoTile)),
            ...(myInviteStatus === 'ACCEPTED' && myLocalVideoTrack
              ? [{ identity: user?.userId || 'me', name: myName, track: myLocalVideoTrack, muted: true, mirror: true } as VideoTile]
              : []),
          ]}
        />
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
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 320 }}
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
          {isModerator && (
            <TouchableOpacity style={styles.circleBtn} onPress={() => setModPanelOpen((o) => !o)}>
              <Ionicons name="shield-checkmark" size={18} color="#FFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.circleBtn} onPress={reportStream}>
            <Ionicons name="flag-outline" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Creator info — top-left, TikTok-style: avatar, name, follow pill */}
        <View style={styles.creatorBarOverlay}>
          <Image
            source={{ uri: `https://api.dicebear.com/7.x/avataaars/png?seed=${stream.creator.avatarSeed}` }}
            style={styles.avatar}
          />
          <View style={{ flex: 1 }}>
            <View style={styles.creatorNameRow}>
              <Text style={styles.creatorNameOverlay} numberOfLines={1}>{stream.creator.name}</Text>
              {stream.creator.verified && <Ionicons name="checkmark-circle" size={14} color={COLORS.secondary} />}
            </View>
            {followerCount !== null && (
              <Text style={styles.followerCountText}>{formatCount(followerCount)} followers</Text>
            )}
          </View>
          {!isOwnStream && (
            <TouchableOpacity
              style={[styles.followBtn, following && styles.followBtnActive]}
              onPress={toggleFollow}
              disabled={followLoading}
            >
              <Text style={[styles.followBtnText, following && styles.followBtnTextActive]}>
                {following ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {myInviteStatus === 'INVITED' && (
          <View style={styles.guestInviteBanner}>
            <Ionicons name="videocam" size={18} color="#FFF" />
            <Text style={styles.guestInviteText}>{stream.creator.name} invited you to go live with them</Text>
            <TouchableOpacity
              style={styles.guestInviteAccept}
              disabled={respondingInvite}
              onPress={acceptGuestInvite}
            >
              <Text style={styles.guestInviteAcceptText}>{respondingInvite ? '…' : 'Join'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.guestInviteDecline} disabled={respondingInvite} onPress={declineGuestInvite}>
              <Ionicons name="close" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}

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

        {/* Big heart burst on double-tap-to-like, dead center — the classic
            TikTok like gesture confirmation. */}
        {heartBurstNonce > 0 && (
          <View pointerEvents="none" style={styles.centerHeartWrap} key={heartBurstNonce}>
            <Ionicons name="heart" size={96} color="rgba(255,255,255,0.9)" />
          </View>
        )}

        {/* Tap area — double-tap to like */}
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleDoubleTap} />

        {isRealStream && realStream.roomId && (
          <View style={styles.categoryPanelWrap}>
            <LiveCategoryViewerPanel
              categoryId={category?.id || realStream.categoryId}
              roomId={realStream.roomId}
              navigation={navigation}
              categoryEvent={categoryEvent}
            />
          </View>
        )}

        {modPanelOpen && isModerator && (
          <View style={styles.modMiniPanel}>
            <View style={styles.modMiniHeader}>
              <Text style={styles.modMiniTitle}>Moderator tools</Text>
              <TouchableOpacity onPress={() => setModPanelOpen(false)}>
                <Ionicons name="close" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 190 }} showsVerticalScrollIndicator={false}>
              {participants.filter((p) => p.userId !== user?.userId && p.userId !== stream?.creator?.id).length === 0 ? (
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>No one else here yet.</Text>
              ) : (
                participants
                  .filter((p) => p.userId !== user?.userId && p.userId !== stream?.creator?.id)
                  .map((p) => {
                    const muted = !!modState?.muted.some((m) => m.userId === p.userId);
                    return (
                      <View key={p.userId} style={styles.modMiniRow}>
                        <Text style={styles.modMiniName}>{p.username}</Text>
                        <View style={{ flexDirection: 'row' }}>
                          <TouchableOpacity
                            style={styles.modMiniBtn}
                            onPress={() => runMod(() => muted
                              ? modApi.unmuteUser(realStream.roomId, p.userId)
                              : modApi.muteUser(realStream.roomId, p.userId))}
                          >
                            <Text style={styles.modMiniBtnText}>{muted ? 'Unmute' : 'Mute'}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.modMiniBtn, { backgroundColor: COLORS.error }]}
                            onPress={() => runMod(() => modApi.kickUser(realStream.roomId, p.userId))}
                          >
                            <Text style={styles.modMiniBtnText}>Kick</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
              )}
            </ScrollView>
          </View>
        )}

        {/* Right-side action rail — TikTok's defining layout: gift/like/
            comment/share stacked along the trailing edge, clear of the
            bottom-left comment feed and the bottom input bar. */}
        <View style={styles.actionRail}>
          <View style={styles.railItem}>
            <TouchableOpacity style={styles.railBtn} onPress={() => react('❤️')}>
              <Text style={styles.railEmoji}>❤️</Text>
            </TouchableOpacity>
            <Text style={styles.railLabel}>{formatCount(reactionCounts['❤️'])}</Text>
          </View>
          <View style={styles.railItem}>
            <TouchableOpacity style={styles.railBtn} onPress={() => setGiftSheetOpen(true)}>
              <Ionicons name="gift" size={24} color={COLORS.warning} />
            </TouchableOpacity>
            <Text style={styles.railLabel}>Gift</Text>
          </View>
          <View style={styles.railItem}>
            <TouchableOpacity
              style={[styles.railBtn, (hasRaisedHand || isSpeaker) && { backgroundColor: 'rgba(59,130,246,0.5)' }]}
              onPress={isSpeaker ? toggleMic : toggleHand}
            >
              <Ionicons
                name={isSpeaker ? (muted ? 'mic-off' : 'mic') : (hasRaisedHand ? 'hand-right' : 'hand-right-outline')}
                size={22}
                color="#FFF"
              />
            </TouchableOpacity>
            <Text style={styles.railLabel}>
              {isSpeaker && mySpeakerState ? `${Math.max(0, Math.floor((mySpeakerState.timerEnd - now) / 1000))}s` : 'Speak'}
            </Text>
          </View>
          <View style={styles.railItem}>
            <TouchableOpacity style={styles.railBtn} onPress={shareStream}>
              <Ionicons name="arrow-redo" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.railLabel}>Share</Text>
          </View>
        </View>

        {/* Bottom-left comment feed — TikTok-style: fades in from the
            bottom, only the trailing messages are visible without
            scrolling, leaves the right rail and input bar clear. */}
        <View style={styles.chatOverlayContainer}>
          <ScrollView
            ref={chatRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ justifyContent: 'flex-end', flexGrow: 1 }}
          >
            {recentChat.map((m: any) => (
              <View key={m.id} style={styles.chatMessageBubble}>
                <Text style={styles.chatUser}>{m.senderName} </Text>
                {m.msgType === 'emoji' && m.emojiType ? (
                  <CustomEmoji type={m.emojiType} size={28} />
                ) : m.msgType === 'gif' && m.gifUrl ? (
                  <Image source={{ uri: m.gifUrl }} style={styles.chatGif} resizeMode="cover" />
                ) : (
                  <Text style={styles.chatLine}>{m.text}</Text>
                )}
                {isRealStream && canModerate && (
                  <TouchableOpacity style={styles.chatDeleteBtn} onPress={() => deleteMessage(m.id)}>
                    <Ionicons name="trash-outline" size={12} color="rgba(255,255,255,0.6)" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>
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
    </View>
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
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,59,48,0.9)', borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  livePillText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  viewersPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 4 },
  viewersText: { color: '#FFF', fontSize: 11, fontWeight: '700' },

  creatorBarOverlay: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.md, marginTop: SPACING.sm, paddingRight: 76 },
  avatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: '#FFF' },
  creatorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  creatorNameOverlay: { color: '#FFF', fontSize: 15, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  followerCountText: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 1 },
  followBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.pill },
  followBtnActive: { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  followBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  followBtnTextActive: { color: '#FFF' },

  giftToastWrap: { position: 'absolute', top: 100, left: 0, right: 0, alignItems: 'center' },
  centerHeartWrap: { position: 'absolute', top: '38%', left: 0, right: 0, alignItems: 'center', zIndex: 5 },
  guestInviteBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(124,58,237,0.9)', borderRadius: RADIUS.md,
    marginHorizontal: SPACING.md, marginTop: SPACING.sm, padding: SPACING.sm,
  },
  guestInviteText: { flex: 1, color: '#FFF', fontSize: 12, fontWeight: '600' },
  guestInviteAccept: { backgroundColor: '#FFF', borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 6 },
  guestInviteAcceptText: { color: '#7C3AED', fontWeight: '800', fontSize: 12 },
  guestInviteDecline: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },

  categoryPanelWrap: { maxHeight: 220, marginHorizontal: SPACING.md, marginBottom: SPACING.sm },

  // Right-side vertical action rail
  actionRail: {
    position: 'absolute', right: SPACING.sm, bottom: 210,
    alignItems: 'center', gap: SPACING.lg,
  },
  railItem: { alignItems: 'center', gap: 4 },
  railBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  railEmoji: { fontSize: 22 },
  railLabel: { color: '#FFF', fontSize: 11, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },

  // Bottom-left comment feed
  chatOverlayContainer: {
    position: 'absolute', left: SPACING.md, right: 76, bottom: 68,
    height: 200, justifyContent: 'flex-end',
  },
  chatMessageBubble: { backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 6, alignSelf: 'flex-start', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', maxWidth: '100%' },
  chatDeleteBtn: { marginLeft: 8, padding: 2 },
  modMiniPanel: {
    position: 'absolute', bottom: 280, left: SPACING.md, right: SPACING.md,
    backgroundColor: 'rgba(18,18,26,0.97)', borderRadius: RADIUS.lg, padding: SPACING.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', zIndex: 100, maxHeight: 260,
  },
  modMiniHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modMiniTitle: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  modMiniRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  modMiniName: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  modMiniBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 6 },
  modMiniBtnText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  chatUser: { color: COLORS.secondary, fontWeight: '700', fontSize: 13 },
  chatLine: { color: '#FFF', fontSize: 13, lineHeight: 18, flex: 1 },
  chatGif: { width: 140, height: 100, borderRadius: RADIUS.sm, marginTop: 4 },

  // Emoji tray
  emojiTray: { position: 'absolute', bottom: 68, left: SPACING.md, flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.lg, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: RADIUS.lg, maxWidth: '85%' },
  emojiTrayItem: { alignItems: 'center', gap: 4 },
  emojiTrayLabel: { color: '#FFF', fontSize: 10, fontWeight: '700' },

  // Chat input
  chatInputOverlayRow: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, alignItems: 'center' },
  inputIconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  gifBtn: { backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 6, justifyContent: 'center', alignItems: 'center' },
  gifBtnText: { color: '#FFF', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  chatInputOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.pill, paddingHorizontal: 16, paddingVertical: 10, color: '#FFF' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
});
