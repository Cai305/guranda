import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Image, ImageBackground, ActivityIndicator, Alert, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useFocusEffect } from '@react-navigation/native';

import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { ChatMessageDto, VemojiType, encodeVemojiMessage, parseVemojiMessage } from '@mxit2/types';
import { Ionicons } from '@expo/vector-icons';
import EmptyState from '../components/EmptyState';
import EmojiPicker from '../components/EmojiPicker';
import GifPicker from '../components/GifPicker';
import VemojiPicker from '../components/VemojiPicker';
import CustomEmoji from '../components/live/CustomEmoji';
import EmojiBurstOverlay from '../components/live/EmojiBurstOverlay';
import VoiceMessageBubble from '../components/VoiceMessageBubble';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useLiveSound, LIVE_SOUND_DURATION_MS } from '../live/useLiveSound';
import { fetchApi, uploadMedia } from '../utils/api';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import MiniAppProductPicker from '../components/MiniAppProductPicker';
import MiniAppEventPicker from '../components/MiniAppEventPicker';
import ProductMiniCard, { ProductCardData } from '../components/cards/ProductMiniCard';
import EventMiniCard, { decodeEventCard } from '../components/cards/EventMiniCard';
import ChatWallpaperPicker from '../components/chat/ChatWallpaperPicker';
import { findPreset, isPresetId } from '../config/chatWallpapers';

const isVideoUrl = (url: string) => /\.(mp4|mov|webm|m3u8)(\?|$)/i.test(url);
const isAudioUrl = (url: string) => /\.(m4a|mp3|wav|aac|3gp|ogg|caf)(\?|$)/i.test(url);

function formatClockTime(date?: Date | string): string {
  const d = date ? new Date(date) : new Date();
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

// A message can carry media with no caption — Message.content is a required
// non-null column, so "no text" is stored as '' rather than null; render
// bubbles need to treat that as "media-only", not an empty text bubble.
function MediaBubble({ url, mine }: { url: string; mine: boolean }) {
  const isVideo = isVideoUrl(url);
  const player = useVideoPlayer(isVideo ? url : null, p => { p.loop = false; });

  if (isAudioUrl(url)) return <VoiceMessageBubble uri={url} mine={mine} />;
  if (isVideo) {
    return (
      <VideoView style={mediaBubbleStyles.mediaVideo} player={player} allowsPictureInPicture nativeControls />
    );
  }
  return <Image source={{ uri: url }} style={mediaBubbleStyles.mediaImage} resizeMode="cover" />;
}

const mediaBubbleStyles = StyleSheet.create({
  mediaImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
  },
  mediaVideo: {
    width: 220,
    height: 220,
    borderRadius: 12,
    backgroundColor: '#000',
  },
});

export default function ChatScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const { user } = useAuth();
  const { roomId = 'global-room', roomName = 'Global Lounge', roomType = 'Public', targetUserId, avatarUrl } = route?.params || {};

  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showVemojiPicker, setShowVemojiPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showEventPicker, setShowEventPicker]     = useState(false);
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);
  const [emojiBurst, setEmojiBurst] = useState<{ type: VemojiType; nonce: number } | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessageDto | null>(null);
  const [actionSheetMessage, setActionSheetMessage] = useState<ChatMessageDto | null>(null);
  const [forwardTarget, setForwardTarget] = useState<ChatMessageDto | null>(null);
  const [forwardChats, setForwardChats] = useState<any[]>([]);
  const [forwardLoading, setForwardLoading] = useState(false);
  const [selectedForwardIds, setSelectedForwardIds] = useState<Set<string>>(new Set());
  const [forwarding, setForwarding] = useState(false);
  const { socket, onlineUsers } = useSocket();
  const voiceRecorder = useVoiceRecorder();
  const { playSound } = useLiveSound();
  const [targetProfile, setTargetProfile] = useState<{ avatarUrl?: string; effectiveStatus?: string | null } | null>(null);

  const isOnline = !!targetUserId && onlineUsers[targetUserId] === 'online';
  const statusText = targetUserId ? (isOnline ? 'online' : 'offline') : (roomType || '').toLowerCase();

  useFocusEffect(
    React.useCallback(() => {
      if (!targetUserId) return;
      fetchApi(`/users/${targetUserId}/public-profile`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => setTargetProfile(data))
        .catch(() => {});
    }, [targetUserId])
  );

  // Individual conversations are a full-screen surface (own input row at
  // the very bottom, like WhatsApp/Messenger) — the floating bottom tab bar
  // otherwise renders on top of the message input. Hidden only while this
  // screen is focused; ChatListScreen (the tab-level "Chats" screen) keeps it.
  useFocusEffect(
    React.useCallback(() => {
      const parent = navigation.getParent();
      parent?.setOptions({ tabBarStyle: { display: 'none' } });
      return () => parent?.setOptions({ tabBarStyle: undefined });
    }, [navigation])
  );

  useEffect(() => {
    // 1. Fetch historical messages
    setMessagesLoading(true);
    fetchApi(`/chats/${roomId}/messages`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setMessages(data);
      })
      .catch(console.error)
      .finally(() => setMessagesLoading(false));

    if (!socket) return;

    socket.emit('join_room', { chatId: roomId });

    const messageHandler = (msg: ChatMessageDto) => {
      // The socket connection is shared app-wide and this client stays
      // joined to every chat room it's a member of (see joinUserSockets on
      // the server) — without this guard, a message delivered to a
      // *different* open chat (e.g. one this message was just forwarded
      // into) would incorrectly append to whichever room screen happens to
      // be mounted right now.
      if (msg.chatId !== roomId) return;
      setMessages((prev) => [...prev, msg]);
      // Fires for the sender too (the room broadcast echoes back), so this
      // one handler covers both sending and receiving a vemoji reaction.
      const vemojiType = parseVemojiMessage(msg.content);
      if (vemojiType) {
        playSound(vemojiType);
        setEmojiBurst({ type: vemojiType, nonce: Date.now() });
      }
    };

    socket.on('new_message', messageHandler);

    return () => {
      socket.off('new_message', messageHandler);
    };
  }, [socket, roomId]);

  useEffect(() => {
    if (!socket) return;
    const onForwardAck = (data: { ok: boolean; count?: number; error?: string }) => {
      setForwarding(false);
      setForwardTarget(null);
      if (!data.ok) Alert.alert('Forward failed', data.error || 'Please try again.');
    };
    socket.on('forward_ack', onForwardAck);
    return () => { socket.off('forward_ack', onForwardAck); };
  }, [socket]);

  useEffect(() => {
    fetchApi(`/chats/${roomId}/wallpaper`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => setWallpaperUrl(d?.wallpaperUrl ?? null))
      .catch(() => {});
  }, [roomId]);

  const pendingCallVideo = React.useRef(false);

  const startCall = (video: boolean) => {
    if (!socket || !user?.userId || !targetUserId) return;
    pendingCallVideo.current = video;
    socket.emit('call_invite', {
      callerId: user.userId,
      callerName: user.displayName || user.username,
      targetUserId,
      video,
    });
  };

  // Only DIRECT/Private chats (a real targetUserId) can be called — group
  // calling isn't built yet. call_ringing is the server's ack once it's
  // minted our token and pushed the ring to the other side; only then do we
  // actually navigate in (avoids a "calling" screen for a call that instantly
  // failed, e.g. the other user being offline — see call_failed below).
  useEffect(() => {
    if (!socket) return;
    const onRinging = (data: { callId: string; roomName: string; wsUrl: string; token: string }) => {
      navigation.navigate('CallScreen', {
        ...data,
        video: pendingCallVideo.current,
        peerName: roomName,
        isCaller: true,
      });
    };
    const onFailed = (data: { reason: string }) => Alert.alert('Call failed', data.reason);
    socket.on('call_ringing', onRinging);
    socket.on('call_failed', onFailed);
    return () => {
      socket.off('call_ringing', onRinging);
      socket.off('call_failed', onFailed);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, roomName]);

  const sendMessage = () => {
    if (!inputText.trim() || !socket || !user?.userId) return;

    const newMsg: ChatMessageDto = {
      chatId: roomId,
      senderId: user.userId,
      content: inputText.trim(),
      replyToId: replyingTo?.id,
    };

    socket.emit('send_message', newMsg);
    setInputText('');
    setReplyingTo(null);

    // Mock AI Response for MVP
    if (roomType === 'AI') {
      setTimeout(() => {
        const aiMsg: ChatMessageDto = {
          chatId: roomId,
          senderId: 'bot',
          content: `Thanks for the message! ${roomName} will get back to you soon.`,
          isAiGenerated: true,
        };
        // Just append it locally for the illusion of an AI reply
        setMessages((prev) => [...prev, aiMsg]);
      }, 1500);
    }
  };

  const sendMediaUrl = (mediaUrl: string) => {
    if (!socket || !user?.userId) return;
    const newMsg: ChatMessageDto = { chatId: roomId, senderId: user.userId, content: '', mediaUrl, replyToId: replyingTo?.id };
    socket.emit('send_message', newMsg);
    setReplyingTo(null);
  };

  const pickAndSendMedia = async () => {
    if (!socket || !user?.userId || uploadingMedia) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const kind = asset.type === 'video' ? 'video' : 'image';

    try {
      setUploadingMedia(true);
      const uploaded = await uploadMedia(asset.uri, kind);
      sendMediaUrl(uploaded.url);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message || 'Could not send that file. Please try again.');
    } finally {
      setUploadingMedia(false);
    }
  };

  const captureAndSendMedia = async () => {
    if (!socket || !user?.userId || uploadingMedia) return;
    let result: ImagePicker.ImagePickerResult;
    try {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) {
        Alert.alert('Camera permission needed', 'Allow camera access to take a photo or video.');
        return;
      }
      // Both photo and video capture — the native camera UI gives a
      // photo/video mode toggle when both are allowed, same as WhatsApp/iMessage.
      result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], quality: 0.8 });
    } catch (e: any) {
      Alert.alert('Camera error', e.message || 'Could not open the camera.');
      return;
    }
    if (result.canceled) return;
    const asset = result.assets[0];
    const kind = asset.type === 'video' ? 'video' : 'image';

    try {
      setUploadingMedia(true);
      const uploaded = await uploadMedia(asset.uri, kind);
      sendMediaUrl(uploaded.url);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message || 'Could not send that. Please try again.');
    } finally {
      setUploadingMedia(false);
    }
  };

  const toggleVoiceRecording = async () => {
    if (voiceRecorder.isRecording) {
      const result = await voiceRecorder.stop();
      if (!result) return;
      try {
        setUploadingMedia(true);
        const uploaded = await uploadMedia(result.uri, 'audio');
        sendMediaUrl(uploaded.url);
      } catch (e: any) {
        Alert.alert('Upload failed', e.message || 'Could not send that voice message.');
      } finally {
        setUploadingMedia(false);
      }
    } else {
      const started = await voiceRecorder.start();
      if (!started && voiceRecorder.error) Alert.alert('Microphone', voiceRecorder.error);
    }
  };

  const sendGif = (gifUrl: string) => {
    sendMediaUrl(gifUrl);
    setShowGifPicker(false);
  };

  const sendProductCard = (product: ProductCardData) => {
    if (!socket || !user?.userId) return;
    const payload = JSON.stringify({ __productCard: true, ...product });
    const newMsg: ChatMessageDto = {
      chatId: roomId,
      senderId: user.userId,
      content: payload,
      replyToId: replyingTo?.id,
    };
    socket.emit('send_message', newMsg);
    setReplyingTo(null);
  };

  const sendEventCard = (encodedPayload: string) => {
    if (!socket || !user?.userId) return;
    const newMsg: ChatMessageDto = {
      chatId: roomId,
      senderId: user.userId,
      content: encodedPayload,
      replyToId: replyingTo?.id,
    };
    socket.emit('send_message', newMsg);
    setReplyingTo(null);
  };

  const sendVemoji = (type: VemojiType) => {
    if (!socket || !user?.userId) return;
    const newMsg: ChatMessageDto = { chatId: roomId, senderId: user.userId, content: encodeVemojiMessage(type), replyToId: replyingTo?.id };
    socket.emit('send_message', newMsg);
    setShowVemojiPicker(false);
    setReplyingTo(null);
  };

  const openForward = async (message: ChatMessageDto) => {
    setForwardTarget(message);
    setSelectedForwardIds(new Set());
    setForwardLoading(true);
    try {
      const res = await fetchApi('/chats');
      const data = await res.json();
      setForwardChats(Array.isArray(data) ? data.filter((c: any) => c.id !== roomId) : []);
    } catch {
      setForwardChats([]);
    } finally {
      setForwardLoading(false);
    }
  };

  const toggleForwardChat = (chatId: string) => {
    setSelectedForwardIds(prev => {
      const next = new Set(prev);
      if (next.has(chatId)) next.delete(chatId); else next.add(chatId);
      return next;
    });
  };

  const confirmForward = () => {
    if (!socket || !user?.userId || !forwardTarget?.id || selectedForwardIds.size === 0) return;
    setForwarding(true);
    socket.emit('forward_message', {
      userId: user.userId,
      messageId: forwardTarget.id,
      targetChatIds: Array.from(selectedForwardIds),
    });
  };

  const renderMessage = ({ item }: { item: ChatMessageDto }) => {
    const isMe = item.senderId === user?.userId;
    const isAi = item.isAiGenerated || item.senderId === 'bot';
    const vemojiType = parseVemojiMessage(item.content);
    const mediaOnly = !!item.mediaUrl && !item.content;
    const stickerOnly = mediaOnly || !!vemojiType;

    // Detect product card payload
    let productCard: ProductCardData | null = null;
    if (item.content && item.content.startsWith('{') && item.content.includes('__productCard')) {
      try { const parsed = JSON.parse(item.content); if (parsed.__productCard) { const { __productCard, ...rest } = parsed; productCard = rest as ProductCardData; } } catch {}
    }

    // Detect event card payload
    const eventCard = item.content?.includes('__eventCard') ? decodeEventCard(item.content) : null;

    const replyPreviewText = item.replyTo
      ? (parseVemojiMessage(item.replyTo.content) ? '🔥 Vemoji' : (item.replyTo.content || (item.replyTo.mediaUrl ? '📎 Attachment' : '')))
      : '';

    if (eventCard) {
      return (
        <View style={[styles.productBubbleWrap, isMe ? styles.productBubbleMe : styles.productBubbleThem]}>
          {isMe && (
            <View style={styles.productBubbleLabel}>
              <Ionicons name="calendar" size={11} color={COLORS.primary} />
              <Text style={styles.productBubbleLabelText}>Event</Text>
            </View>
          )}
          <EventMiniCard
            event={eventCard}
            chatTargetUserId={isMe ? targetUserId : undefined}
            chatTargetName={isMe ? roomName : undefined}
            navigation={navigation}
            canBook={true}
          />
          <Text style={[styles.metaTime, { alignSelf: isMe ? 'flex-end' : 'flex-start', marginTop: 4 }]}>
            {formatClockTime(item.createdAt)}
          </Text>
        </View>
      );
    }

    if (productCard) {
      return (
        <View style={[styles.productBubbleWrap, isMe ? styles.productBubbleMe : styles.productBubbleThem]}>
          {isMe && (
            <View style={styles.productBubbleLabel}>
              <Ionicons name="bag-handle" size={11} color={COLORS.primary} />
              <Text style={styles.productBubbleLabelText}>Product Suggestion</Text>
            </View>
          )}
          <ProductMiniCard product={productCard} compact navigation={navigation} />
          <Text style={[styles.metaTime, { alignSelf: isMe ? 'flex-end' : 'flex-start', marginTop: 4 }]}>
            {formatClockTime(item.createdAt)}
          </Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onLongPress={() => item.id && setActionSheetMessage(item)}
        style={[
          styles.messageBubble,
          isMe ? styles.myMessage : (isAi ? styles.aiMessage : styles.theirMessage),
          mediaOnly && styles.mediaOnlyBubble,
          !!vemojiType && styles.vemojiBubble,
        ]}
      >
        {item.isForwarded && (
          <View style={styles.forwardedRow}>
            <Ionicons name="arrow-redo-outline" size={11} color={isMe ? 'rgba(255,255,255,0.75)' : COLORS.textMuted} />
            <Text style={[styles.forwardedText, isMe && { color: 'rgba(255,255,255,0.75)' }]}>Forwarded</Text>
          </View>
        )}
        {item.replyTo && (
          <View style={[styles.replyQuote, isMe && styles.replyQuoteMine]}>
            <Text style={[styles.replyQuoteSender, isMe && { color: '#FFF' }]} numberOfLines={1}>
              {item.replyTo.senderId === user?.userId ? 'You' : item.replyTo.senderName}
            </Text>
            <Text style={[styles.replyQuoteText, isMe && { color: 'rgba(255,255,255,0.85)' }]} numberOfLines={1}>
              {replyPreviewText}
            </Text>
          </View>
        )}
        {vemojiType ? (
          <CustomEmoji type={vemojiType} size={72} />
        ) : (
          <>
            {item.mediaUrl && <MediaBubble url={item.mediaUrl} mine={isMe} />}
            {!!item.content && (
              <Text style={[styles.messageText, isAi && { color: COLORS.secondary }, item.mediaUrl && { marginTop: 6 }]}>
                {item.content}
              </Text>
            )}
          </>
        )}
        <View style={[styles.metaRow, stickerOnly && styles.metaRowOnMedia]}>
          <Text style={[styles.metaTime, isMe && !stickerOnly && styles.metaTimeMine, stickerOnly && styles.metaTimeOnMedia]}>
            {formatClockTime(item.createdAt)}
          </Text>
          {isMe && (
            <Ionicons
              name="checkmark-done"
              size={14}
              color={stickerOnly ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.75)'}
              style={{ marginLeft: 3 }}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const styles = useThemedStyles(({ COLORS }) => ({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    keyboardContainer: {
      flex: 1,
    },
    roomHeader: {
      padding: 12,
      backgroundColor: COLORS.surface,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      flexDirection: 'row',
      alignItems: 'center',
    },
    backBtn: {
      marginRight: 6,
      padding: 4,
    },
    headerAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: COLORS.background,
      marginRight: 10,
    },
    roomHeaderContent: {
      flex: 1,
    },
    headerName: {
      color: COLORS.text,
      fontSize: 16,
      fontWeight: '700',
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 2,
    },
    statusText: {
      color: COLORS.textMuted,
      fontSize: 12,
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: '#22C55E',
    },
    callButtons: {
      flexDirection: 'row',
      gap: 4,
    },
    headerIconBtn: {
      padding: 8,
    },
    messageList: {
      padding: 12,
      gap: 6,
    },
    messageBubble: {
      maxWidth: '78%',
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 6,
      borderRadius: 14,
    },
    myMessage: {
      alignSelf: 'flex-end',
      backgroundColor: COLORS.primary,
      borderBottomRightRadius: 2,
    },
    theirMessage: {
      alignSelf: 'flex-start',
      backgroundColor: COLORS.surface,
      borderBottomLeftRadius: 2,
    },
    aiMessage: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(0, 255, 255, 0.1)',
      borderWidth: 1,
      borderColor: COLORS.secondary,
      borderBottomLeftRadius: 2,
    },
    messageText: {
      color: COLORS.text,
      fontSize: 15.5,
      lineHeight: 20,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-end',
      marginTop: 3,
    },
    metaRowOnMedia: {
      position: 'absolute',
      bottom: 6,
      right: 8,
      backgroundColor: 'rgba(0,0,0,0.45)',
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    metaTime: {
      color: 'rgba(255,255,255,0.55)',
      fontSize: 10.5,
    },
    metaTimeMine: {
      color: 'rgba(255,255,255,0.75)',
    },
    metaTimeOnMedia: {
      color: 'rgba(255,255,255,0.9)',
    },
    mediaOnlyBubble: {
      padding: 4,
    },
    vemojiBubble: {
      backgroundColor: 'transparent',
      padding: 4,
    },
    inputContainer: {
      flexDirection: 'row',
      padding: 10,
      alignItems: 'flex-end',
      gap: 8,
      backgroundColor: COLORS.background,
    },
    inputPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingLeft: 8,
      paddingRight: 6,
    },
    pillIconBtn: {
      padding: 3,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pillIconBtnLast: {
      paddingRight: 0,
    },
    gifButtonText: {
      color: COLORS.textMuted,
      fontSize: 9.5,
      fontWeight: '800',
      borderWidth: 1.3,
      borderColor: COLORS.textMuted,
      borderRadius: 4,
      paddingHorizontal: 3,
      paddingVertical: 1,
    },
    input: {
      flex: 1,
      color: COLORS.text,
      paddingVertical: 10,
      paddingHorizontal: 6,
      fontSize: 15,
      maxHeight: 100,
    },
    sendButton: {
      backgroundColor: COLORS.primary,
      width: 46,
      height: 46,
      borderRadius: 23,
      justifyContent: 'center',
      alignItems: 'center',
    },
    recordingBar: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      gap: 10,
      backgroundColor: COLORS.background,
    },
    recordingCancelBtn: {
      padding: 10,
    },
    recordingIndicator: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: COLORS.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    recordingDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#EF4444',
    },
    recordingText: {
      color: COLORS.text,
      fontSize: 14,
    },
    recordingSendBtn: {
      backgroundColor: COLORS.primary,
      width: 46,
      height: 46,
      borderRadius: 23,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Forwarded label, inside a message bubble
    forwardedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 4,
    },
    forwardedText: {
      color: COLORS.textMuted,
      fontSize: 11,
      fontStyle: 'italic',
    },

    // Quoted reply preview, inside a message bubble
    replyQuote: {
      borderLeftWidth: 3,
      borderLeftColor: COLORS.primary,
      backgroundColor: 'rgba(0,0,0,0.15)',
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 5,
      marginBottom: 6,
    },
    replyQuoteMine: {
      borderLeftColor: '#FFF',
      backgroundColor: 'rgba(255,255,255,0.15)',
    },
    replyQuoteSender: {
      color: COLORS.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    replyQuoteText: {
      color: COLORS.textMuted,
      fontSize: 12.5,
      marginTop: 1,
    },

    // "Replying to…" bar above the input, before sending
    replyBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 10,
      marginTop: 6,
      backgroundColor: COLORS.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    replyBarAccent: {
      width: 3,
      alignSelf: 'stretch',
      borderRadius: 2,
      backgroundColor: COLORS.primary,
    },
    replyBarSender: {
      color: COLORS.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    replyBarText: {
      color: COLORS.textMuted,
      fontSize: 12.5,
      marginTop: 1,
    },
    replyBarClose: {
      padding: 4,
    },

    // Message action sheet (Reply / Forward)
    sheetOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    actionSheet: {
      backgroundColor: COLORS.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingVertical: 8,
      paddingBottom: 24,
    },
    actionSheetItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    actionSheetItemText: {
      color: COLORS.text,
      fontSize: 15.5,
      fontWeight: '600',
    },

    // Forward-to-chat sheet
    forwardSheet: {
      backgroundColor: COLORS.surface,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      padding: 16,
      paddingBottom: 28,
    },
    forwardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    forwardTitle: {
      color: COLORS.text,
      fontSize: 17,
      fontWeight: '800',
    },
    forwardEmpty: {
      color: COLORS.textMuted,
      fontSize: 13.5,
      textAlign: 'center',
      paddingVertical: 30,
    },
    forwardChatRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    forwardChatAvatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: COLORS.background,
    },
    forwardChatName: {
      flex: 1,
      color: COLORS.text,
      fontSize: 14.5,
      fontWeight: '600',
    },
    forwardConfirmBtn: {
      marginTop: 14,
      backgroundColor: COLORS.primary,
      borderRadius: 24,
      paddingVertical: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    forwardConfirmText: {
      color: '#FFF',
      fontWeight: '800',
      fontSize: 15,
    },

    // Product card bubble
    productBubbleWrap: {
      marginVertical: 2,
      maxWidth: '85%',
    },
    productBubbleMe: { alignSelf: 'flex-end' },
    productBubbleThem: { alignSelf: 'flex-start' },
    productBubbleLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 5,
      paddingLeft: 4,
    },
    productBubbleLabelText: {
      color: COLORS.primary,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={styles.container}>
        <EmojiBurstOverlay
          type={emojiBurst?.type ?? null}
          nonce={emojiBurst?.nonce ?? 0}
          durationMs={LIVE_SOUND_DURATION_MS}
        />
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.roomHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
              onPress={() => {
                if (targetUserId) {
                  navigation.navigate('UserProfile', {
                    userId: targetUserId,
                    username: roomName,
                    avatarUrl: targetProfile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${roomName}`
                  });
                }
              }}
              disabled={!targetUserId}
            >
              <Image
                source={{ uri: targetProfile?.avatarUrl || avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${roomName}` }}
                style={styles.headerAvatar}
              />
              <View style={styles.roomHeaderContent}>
                <Text style={styles.headerName} numberOfLines={1}>{roomName}</Text>
                <View style={styles.statusRow}>
                  {isOnline && <View style={styles.statusDot} />}
                  <Text style={styles.statusText} numberOfLines={1}>
                    {targetProfile?.effectiveStatus || statusText}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
            <View style={styles.callButtons}>
              <TouchableOpacity onPress={() => setShowWallpaperPicker(true)} style={styles.headerIconBtn}>
                <Ionicons name="image-outline" size={20} color={COLORS.text} />
              </TouchableOpacity>
              {!!targetUserId && (
                <>
                  <TouchableOpacity onPress={() => startCall(false)} style={styles.headerIconBtn}>
                    <Ionicons name="call" size={20} color={COLORS.text} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => startCall(true)} style={styles.headerIconBtn}>
                    <Ionicons name="videocam" size={22} color={COLORS.text} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {(() => {
            const preset = findPreset(wallpaperUrl);
            const list = messagesLoading ? (
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <ActivityIndicator color={COLORS.primary} />
              </View>
            ) : (
              <FlatList
                data={messages}
                keyExtractor={(item, index) => item.id || index.toString()}
                renderItem={renderMessage}
                contentContainerStyle={[styles.messageList, messages.length === 0 && { flex: 1 }]}
                style={{ flex: 1 }}
                ListEmptyComponent={
                  <EmptyState
                    icon="chatbubble-ellipses-outline"
                    title="Say hi"
                    subtitle={`This is the start of your conversation with ${roomName}.`}
                  />
                }
              />
            );
            if (preset) {
              return <LinearGradient colors={preset.colors} style={{ flex: 1 }}>{list}</LinearGradient>;
            }
            if (wallpaperUrl && !isPresetId(wallpaperUrl)) {
              return <ImageBackground source={{ uri: wallpaperUrl }} style={{ flex: 1 }}>{list}</ImageBackground>;
            }
            return list;
          })()}

          {replyingTo && (
            <View style={styles.replyBar}>
              <View style={styles.replyBarAccent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.replyBarSender}>
                  Replying to {replyingTo.senderId === user?.userId ? 'yourself' : roomName}
                </Text>
                <Text style={styles.replyBarText} numberOfLines={1}>
                  {parseVemojiMessage(replyingTo.content) ? '🔥 Vemoji' : (replyingTo.content || (replyingTo.mediaUrl ? '📎 Attachment' : ''))}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.replyBarClose}>
                <Ionicons name="close" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {voiceRecorder.isRecording ? (
            <View style={styles.recordingBar}>
              <TouchableOpacity onPress={voiceRecorder.cancel} style={styles.recordingCancelBtn}>
                <Ionicons name="trash-outline" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>Recording…</Text>
              </View>
              <TouchableOpacity onPress={toggleVoiceRecording} style={styles.recordingSendBtn}>
                <Ionicons name="send" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.inputContainer}>
              <View style={styles.inputPill}>
                <TouchableOpacity
                  style={styles.pillIconBtn}
                  onPress={() => { setShowEmojiPicker(v => !v); setShowGifPicker(false); setShowVemojiPicker(false); }}
                >
                  <Ionicons name={showEmojiPicker ? 'close-circle' : 'happy-outline'} size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  placeholder="Message"
                  placeholderTextColor={COLORS.textMuted}
                  value={inputText}
                  onChangeText={setInputText}
                  onSubmitEditing={sendMessage}
                  multiline
                />
                <TouchableOpacity
                  style={styles.pillIconBtn}
                  onPress={() => { setShowVemojiPicker(v => !v); setShowEmojiPicker(false); setShowGifPicker(false); }}
                >
                  {showVemojiPicker ? (
                    <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                  ) : (
                    <CustomEmoji type="fire" size={18} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.pillIconBtn}
                  onPress={() => { setShowGifPicker(v => !v); setShowEmojiPicker(false); setShowVemojiPicker(false); }}
                >
                  {showGifPicker ? (
                    <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                  ) : (
                    <Text style={styles.gifButtonText}>GIF</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.pillIconBtn} onPress={pickAndSendMedia} disabled={uploadingMedia}>
                  <Ionicons name="attach" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.pillIconBtn, styles.pillIconBtnLast]} onPress={captureAndSendMedia} disabled={uploadingMedia}>
                  <Ionicons name="camera-outline" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pillIconBtn, styles.pillIconBtnLast]}
                  onPress={() => { setShowEmojiPicker(false); setShowGifPicker(false); setShowVemojiPicker(false); setShowProductPicker(true); }}
                >
                  <Ionicons name="bag-handle-outline" size={18} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pillIconBtn, styles.pillIconBtnLast]}
                  onPress={() => { setShowEmojiPicker(false); setShowGifPicker(false); setShowVemojiPicker(false); setShowProductPicker(false); setShowEventPicker(true); }}
                >
                  <Ionicons name="calendar-outline" size={18} color="#ec4899" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pillIconBtn, styles.pillIconBtnLast]}
                  onPress={() => navigation.navigate('Life', { screen: 'LudoLobby' })}
                >
                  <Ionicons name="game-controller-outline" size={18} color="#10B981" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.sendButton}
                onPress={inputText.trim() ? sendMessage : toggleVoiceRecording}
                disabled={uploadingMedia}
              >
                {uploadingMedia ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name={inputText.trim() ? 'send' : 'mic'} size={20} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          )}

          {showEmojiPicker && (
            <EmojiPicker onSelect={(emoji) => setInputText(prev => prev + emoji)} />
          )}
          {showVemojiPicker && <VemojiPicker onSelect={sendVemoji} />}
          {showGifPicker && <GifPicker onSelect={sendGif} />}
          <MiniAppProductPicker
            visible={showProductPicker}
            onClose={() => setShowProductPicker(false)}
            onSendProduct={sendProductCard}
          />
          <MiniAppEventPicker
            visible={showEventPicker}
            onClose={() => setShowEventPicker(false)}
            onSendEvent={sendEventCard}
          />
          <ChatWallpaperPicker
            visible={showWallpaperPicker}
            onClose={() => setShowWallpaperPicker(false)}
            scope="chat"
            chatId={roomId}
            currentValue={wallpaperUrl}
            onSaved={setWallpaperUrl}
          />
        </KeyboardAvoidingView>
      </View>

      <Modal
        visible={!!actionSheetMessage}
        transparent
        animationType="fade"
        onRequestClose={() => setActionSheetMessage(null)}
      >
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setActionSheetMessage(null)}>
          <View style={styles.actionSheet}>
            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={() => {
                setReplyingTo(actionSheetMessage);
                setActionSheetMessage(null);
              }}
            >
              <Ionicons name="arrow-undo" size={20} color={COLORS.text} />
              <Text style={styles.actionSheetItemText}>Reply</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={() => {
                const msg = actionSheetMessage;
                setActionSheetMessage(null);
                if (msg) openForward(msg);
              }}
            >
              <Ionicons name="arrow-redo" size={20} color={COLORS.text} />
              <Text style={styles.actionSheetItemText}>Forward</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={!!forwardTarget}
        transparent
        animationType="slide"
        onRequestClose={() => setForwardTarget(null)}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.forwardSheet}>
            <View style={styles.forwardHeader}>
              <Text style={styles.forwardTitle}>Forward to…</Text>
              <TouchableOpacity onPress={() => setForwardTarget(null)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            {forwardLoading ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 30 }} />
            ) : (
              <ScrollView style={{ maxHeight: 320 }}>
                {forwardChats.length === 0 ? (
                  <Text style={styles.forwardEmpty}>No other chats to forward to.</Text>
                ) : (
                  forwardChats.map((chat: any) => {
                    const selected = selectedForwardIds.has(chat.id);
                    return (
                      <TouchableOpacity
                        key={chat.id}
                        style={styles.forwardChatRow}
                        onPress={() => toggleForwardChat(chat.id)}
                      >
                        <Image
                          source={{ uri: `https://api.dicebear.com/7.x/avataaars/png?seed=${chat.name || chat.id}` }}
                          style={styles.forwardChatAvatar}
                        />
                        <Text style={styles.forwardChatName} numberOfLines={1}>{chat.name || 'Chat'}</Text>
                        <Ionicons
                          name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                          size={22}
                          color={selected ? COLORS.primary : COLORS.textMuted}
                        />
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            )}
            <TouchableOpacity
              style={[styles.forwardConfirmBtn, (selectedForwardIds.size === 0 || forwarding) && { opacity: 0.5 }]}
              onPress={confirmForward}
              disabled={selectedForwardIds.size === 0 || forwarding}
            >
              {forwarding ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.forwardConfirmText}>
                  Forward{selectedForwardIds.size ? ` (${selectedForwardIds.size})` : ''}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

