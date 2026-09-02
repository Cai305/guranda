import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Image, ImageBackground, ActivityIndicator, Alert, Modal, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
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
import { formatLastSeen } from '../utils/format';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import MiniAppProductPicker from '../components/MiniAppProductPicker';
import MiniAppEventPicker from '../components/MiniAppEventPicker';
import ProductMiniCard, { ProductCardData } from '../components/cards/ProductMiniCard';
import EventMiniCard, { decodeEventCard } from '../components/cards/EventMiniCard';
import LocationMiniCard, { encodeLocationCard, decodeLocationCard } from '../components/cards/LocationMiniCard';
import ContactMiniCard, { ContactCardData, encodeContactCard, decodeContactCard } from '../components/cards/ContactMiniCard';
import ProfileMiniCard, { decodeProfileCard } from '../components/cards/ProfileMiniCard';
import ChatWallpaperPicker from '../components/chat/ChatWallpaperPicker';
import { findPreset, isPresetId } from '../config/chatWallpapers';
import { searchContacts } from '../utils/deviceToolFulfillment';

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
  const { roomId = 'global-room', roomName = 'Global Lounge', roomType = 'Public', targetUserId, avatarUrl, sharedByUserId } = route?.params || {};

  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showVemojiPicker, setShowVemojiPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showEventPicker, setShowEventPicker]     = useState(false);
  const [showActionsTray, setShowActionsTray] = useState(false);
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);
  const [emojiBurst, setEmojiBurst] = useState<{ type: VemojiType; nonce: number } | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessageDto | null>(null);
  const [actionSheetMessage, setActionSheetMessage] = useState<ChatMessageDto | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessageDto | null>(null);
  const [forwardTarget, setForwardTarget] = useState<ChatMessageDto | null>(null);
  const [forwardChats, setForwardChats] = useState<any[]>([]);
  const [forwardLoading, setForwardLoading] = useState(false);
  const [selectedForwardIds, setSelectedForwardIds] = useState<Set<string>>(new Set());
  const [forwarding, setForwarding] = useState(false);
  const [showLocationSheet, setShowLocationSheet] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactQuery, setContactQuery] = useState('');
  const [contactResults, setContactResults] = useState<ContactCardData[]>([]);
  const [contactSearching, setContactSearching] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [relationshipPartner, setRelationshipPartner] = useState<any>(null);
  const [chatShares, setChatShares] = useState<any[]>([]);
  const [shareBusy, setShareBusy] = useState(false);
  const { socket, onlineUsers, activityLabels } = useSocket();
  const voiceRecorder = useVoiceRecorder();
  const { playSound } = useLiveSound();
  const [targetProfile, setTargetProfile] = useState<{ avatarUrl?: string; effectiveStatus?: string | null; lastSeenAt?: string | null } | null>(null);

  const presenceStatus = targetUserId ? onlineUsers[targetUserId] : undefined;
  const isOnline = presenceStatus === 'online';
  const isBusy = presenceStatus === 'busy' || presenceStatus === 'away';
  // A booking-derived status ("On a flight", "At the gym") is only
  // meaningful while the person is actually online — once they're busy or
  // offline it's stale/misleading, so real presence takes over instead.
  const statusText = !targetUserId
    ? (roomType || '').toLowerCase()
    : isOnline
      ? (targetProfile?.effectiveStatus || 'online')
      : isBusy
        ? ((targetUserId && activityLabels[targetUserId]) || 'busy')
        : formatLastSeen(targetProfile?.lastSeenAt ?? null);

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

    const updateHandler = (updated: ChatMessageDto & { editedAt?: string }) => {
      if (updated.chatId !== roomId) return;
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
    };
    const deleteHandler = (data: { id: string; chatId: string; deletedAt: string }) => {
      if (data.chatId !== roomId) return;
      setMessages((prev) => prev.map((m) => (m.id === data.id ? { ...m, deletedAt: data.deletedAt } as any : m)));
    };

    const errorHandler = (data: { chatId?: string; message: string }) => {
      if (data.chatId && data.chatId !== roomId) return;
      Alert.alert('Error', data.message || 'Something went wrong');
    };

    socket.on('new_message', messageHandler);
    socket.on('message_updated', updateHandler);
    socket.on('message_deleted', deleteHandler);
    socket.on('message_error', errorHandler);

    return () => {
      socket.off('new_message', messageHandler);
      socket.off('message_updated', updateHandler);
      socket.off('message_deleted', deleteHandler);
      socket.off('message_error', errorHandler);
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

    if (editingMessage) {
      socket.emit('edit_message', {
        userId: user.userId,
        messageId: editingMessage.id,
        content: inputText.trim(),
      });
      setInputText('');
      setEditingMessage(null);
      return;
    }

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

  // ── Location sharing ────────────────────────────────────────────────
  // Live location reuses the message-edit capability (Phase 3) instead of a
  // separate tracking endpoint: the initial share is a normal message, and
  // each tick is just an edit_message on that same message id, until the
  // sender explicitly stops or `expiresAt` passes.
  const liveTickRef = useRef<{ messageId: string; lat: number; lng: number; expiresAt?: string; nonce: string; interval: ReturnType<typeof setInterval> } | null>(null);

  const stopLiveLocation = () => {
    const state = liveTickRef.current;
    if (!state || !socket || !user?.userId) return;
    clearInterval(state.interval);
    socket.emit('edit_message', {
      userId: user.userId,
      messageId: state.messageId,
      content: encodeLocationCard({ lat: state.lat, lng: state.lng, live: true, stopped: true, expiresAt: state.expiresAt, nonce: state.nonce } as any),
    });
    liveTickRef.current = null;
  };

  useEffect(() => () => { if (liveTickRef.current) clearInterval(liveTickRef.current.interval); }, []);

  const shareLocation = async (durationMinutes: number | null) => {
    if (!socket || !user?.userId || sharingLocation) return;
    setSharingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location permission needed', 'Enable location access in Settings to share your location.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const lat = loc.coords.latitude, lng = loc.coords.longitude;
      const isLive = durationMinutes !== null;
      const expiresAt = durationMinutes ? new Date(Date.now() + durationMinutes * 60000).toISOString() : undefined;
      const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const payload = encodeLocationCard({ lat, lng, live: isLive || undefined, expiresAt, nonce } as any);

      setShowLocationSheet(false);
      setReplyingTo(null);
      socket.emit('send_message', { chatId: roomId, senderId: user.userId, content: payload, replyToId: replyingTo?.id });

      if (!isLive) return;

      // Capture the server-assigned message id off the broadcast echo (every
      // client, including the sender, receives new_message for their own
      // send) so subsequent ticks know which message to edit.
      const messageId = await new Promise<string | null>((resolve) => {
        const handler = (msg: ChatMessageDto) => {
          if (msg.chatId !== roomId || msg.senderId !== user.userId || !msg.content?.includes(nonce)) return;
          socket.off('new_message', handler);
          resolve(msg.id ?? null);
        };
        socket.on('new_message', handler);
        setTimeout(() => { socket.off('new_message', handler); resolve(null); }, 8000);
      });
      if (!messageId) return;

      liveTickRef.current = { messageId, lat, lng, expiresAt, nonce, interval: setInterval(async () => {
        const state = liveTickRef.current;
        if (!state) return;
        if (state.expiresAt && Date.now() >= new Date(state.expiresAt).getTime()) {
          stopLiveLocation();
          return;
        }
        try {
          const tick = await Location.getCurrentPositionAsync({});
          state.lat = tick.coords.latitude;
          state.lng = tick.coords.longitude;
          socket.emit('edit_message', {
            userId: user.userId,
            messageId: state.messageId,
            content: encodeLocationCard({ lat: state.lat, lng: state.lng, live: true, expiresAt: state.expiresAt, nonce: state.nonce } as any),
          });
        } catch {
          /* transient GPS read failure — try again next tick */
        }
      }, 20_000) };
    } catch {
      Alert.alert('Error', 'Could not get your current location.');
    } finally {
      setSharingLocation(false);
    }
  };

  // ── Contact sharing ─────────────────────────────────────────────────
  const openContactPicker = async () => {
    setShowContactPicker(true);
    setContactQuery('');
    setContactResults([]);
    setContactSearching(true);
    try {
      const result = await searchContacts('');
      if (result.permissionDenied) {
        Alert.alert('Contacts permission needed', 'Enable contacts access in Settings to share a contact.');
      } else {
        setContactResults((result.contacts || []).filter((c: ContactCardData) => c.phoneNumbers?.length));
      }
    } catch {
      setContactResults([]);
    } finally {
      setContactSearching(false);
    }
  };

  const searchContactsDebounced = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onContactQueryChange = (q: string) => {
    setContactQuery(q);
    if (searchContactsDebounced.current) clearTimeout(searchContactsDebounced.current);
    searchContactsDebounced.current = setTimeout(async () => {
      setContactSearching(true);
      try {
        const result = await searchContacts(q);
        setContactResults((result.contacts || []).filter((c: ContactCardData) => c.phoneNumbers?.length));
      } catch {
        /* ignore */
      } finally {
        setContactSearching(false);
      }
    }, 300);
  };

  const sendContactCard = (contact: ContactCardData) => {
    if (!socket || !user?.userId) return;
    socket.emit('send_message', {
      chatId: roomId,
      senderId: user.userId,
      content: encodeContactCard(contact),
      replyToId: replyingTo?.id,
    });
    setReplyingTo(null);
    setShowContactPicker(false);
  };

  // Every action that used to be its own icon crammed next to the input —
  // now grouped in the Chat Actions tray (see the "+" button and the tray
  // Modal in the render). Each onPress closes the tray and clears any other
  // open inline picker before opening its own, same as the old inline
  // toggle buttons did.
  const closeOtherPickers = () => {
    setShowActionsTray(false);
    setShowEmojiPicker(false);
    setShowGifPicker(false);
    setShowVemojiPicker(false);
  };
  const chatActions = [
    {
      key: 'vemoji',
      label: 'Vemoji',
      renderIcon: () => <CustomEmoji type="fire" size={30} />,
      onPress: () => { closeOtherPickers(); setShowVemojiPicker(true); },
    },
    {
      key: 'gif',
      label: 'GIF',
      renderIcon: () => (
        <View style={styles.actionGifBadge}>
          <Text style={styles.actionGifBadgeText}>GIF</Text>
        </View>
      ),
      onPress: () => { closeOtherPickers(); setShowGifPicker(true); },
    },
    {
      key: 'attachment',
      label: 'Attachment',
      renderIcon: () => <Ionicons name="attach" size={30} color={COLORS.textMuted} />,
      onPress: () => { setShowActionsTray(false); pickAndSendMedia(); },
    },
    {
      key: 'camera',
      label: 'Camera',
      renderIcon: () => <Ionicons name="camera-outline" size={30} color={COLORS.textMuted} />,
      onPress: () => { setShowActionsTray(false); captureAndSendMedia(); },
    },
    {
      key: 'shopping',
      label: 'Shopping',
      renderIcon: () => <Ionicons name="bag-handle-outline" size={30} color={COLORS.primary} />,
      onPress: () => { closeOtherPickers(); setShowProductPicker(true); },
    },
    {
      key: 'event',
      label: 'Event',
      renderIcon: () => <Ionicons name="calendar-outline" size={30} color="#ec4899" />,
      onPress: () => { closeOtherPickers(); setShowEventPicker(true); },
    },
    {
      key: 'games',
      label: 'Games',
      renderIcon: () => <Ionicons name="game-controller-outline" size={30} color="#10B981" />,
      onPress: () => { setShowActionsTray(false); navigation.navigate('Life', { screen: 'LudoLobby' }); },
    },
    {
      key: 'location',
      label: 'Location',
      renderIcon: () => <Ionicons name="location-outline" size={30} color="#3B82F6" />,
      onPress: () => { closeOtherPickers(); setShowLocationSheet(true); },
    },
    {
      key: 'contact',
      label: 'Contact',
      renderIcon: () => <Ionicons name="person-outline" size={30} color="#F59E0B" />,
      onPress: () => { setShowActionsTray(false); openContactPicker(); },
    },
    {
      key: 'wallpaper',
      label: 'Wallpaper',
      renderIcon: () => <Ionicons name="image-outline" size={30} color="#A78BFA" />,
      onPress: () => { setShowActionsTray(false); setShowWallpaperPicker(true); },
    },
    // Only the real owner of a DIRECT chat can share it — same condition
    // the header icon used to gate on (see sharedByUserId above).
    ...(roomType === 'DIRECT' && !sharedByUserId
      ? [{
          key: 'shareChat',
          label: 'Share Chat',
          renderIcon: () => <Ionicons name="people-outline" size={30} color="#22D3EE" />,
          onPress: () => { setShowActionsTray(false); openShareModal(); },
        }]
      : []),
  ];

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

  // Relationship-partner shared chats — only the real owner of a DIRECT
  // chat can share/unshare it (a delegate viewing a chat shared TO them
  // never sees this action; see sharedByUserId above). Access is granular:
  // read/write/edit-their-messages/delete-their-messages, each toggleable
  // independently instead of one all-or-nothing switch.
  const DEFAULT_SHARE_PERMISSIONS = { canRead: true, canWrite: true, canUpdateMessages: false, canDeleteMessages: false };
  const [sharePermissions, setSharePermissions] = useState(DEFAULT_SHARE_PERMISSIONS);

  const openShareModal = async () => {
    setShowShareModal(true);
    try {
      const [partnerRes, sharesRes] = await Promise.all([
        fetchApi('/relationships/mine'),
        fetchApi(`/chats/${roomId}/shares`, { headers: { 'Cache-Control': 'no-cache' } }),
      ]);
      const partner = partnerRes.ok ? (await partnerRes.json())?.partner ?? null : null;
      const shares = sharesRes.ok ? await sharesRes.json() : [];
      setRelationshipPartner(partner);
      setChatShares(Array.isArray(shares) ? shares : []);
      const existing = Array.isArray(shares) ? shares.find((s: any) => s.delegateId === partner?.id) : null;
      setSharePermissions(
        existing
          ? {
              canRead: existing.canRead,
              canWrite: existing.canWrite,
              canUpdateMessages: existing.canUpdateMessages,
              canDeleteMessages: existing.canDeleteMessages,
            }
          : DEFAULT_SHARE_PERMISSIONS,
      );
    } catch {
      setRelationshipPartner(null);
      setChatShares([]);
      setSharePermissions(DEFAULT_SHARE_PERMISSIONS);
    }
  };

  const isSharedWithPartner = chatShares.some(s => s.delegateId === relationshipPartner?.id);

  // Creates the share (if not yet shared) or updates its permissions (if
  // already shared) — the backend upserts either way, so this is the same
  // call in both cases.
  const applySharePermissions = async () => {
    if (!relationshipPartner?.id || shareBusy) return;
    setShareBusy(true);
    try {
      const res = await fetchApi(`/chats/${roomId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delegateId: relationshipPartner.id, ...sharePermissions }),
      });
      if (!res.ok) throw new Error('Failed to share');
      setChatShares(prev => {
        const others = prev.filter(s => s.delegateId !== relationshipPartner.id);
        return [...others, { delegateId: relationshipPartner.id, delegateName: relationshipPartner.displayName || relationshipPartner.username, ...sharePermissions }];
      });
    } catch {
      Alert.alert('Something went wrong', 'Please try again.');
    } finally {
      setShareBusy(false);
    }
  };

  const stopSharingWithPartner = async () => {
    if (!relationshipPartner?.id || shareBusy) return;
    setShareBusy(true);
    try {
      await fetchApi(`/chats/${roomId}/unshare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delegateId: relationshipPartner.id }),
      });
      setChatShares(prev => prev.filter(s => s.delegateId !== relationshipPartner.id));
      setSharePermissions(DEFAULT_SHARE_PERMISSIONS);
    } catch {
      Alert.alert('Something went wrong', 'Please try again.');
    } finally {
      setShareBusy(false);
    }
  };

  const startEditMessage = (message: ChatMessageDto) => {
    setActionSheetMessage(null);
    setReplyingTo(null);
    setEditingMessage(message);
    setInputText(message.content);
  };

  const confirmDeleteMessage = (message: ChatMessageDto) => {
    setActionSheetMessage(null);
    Alert.alert('Delete message', 'This will delete the message for everyone in this chat.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (!socket || !user?.userId || !message.id) return;
          socket.emit('delete_message', { userId: user.userId, messageId: message.id });
        },
      },
    ]);
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

    if (item.deletedAt) {
      return (
        <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage, styles.deletedBubble]}>
          <Ionicons name="ban-outline" size={13} color={isMe ? 'rgba(255,255,255,0.7)' : COLORS.textMuted} />
          <Text style={[styles.deletedText, isMe && { color: 'rgba(255,255,255,0.7)' }]}>This message was deleted</Text>
        </View>
      );
    }
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

    // Detect location/contact/profile card payloads
    const locationCard = item.content?.includes('__locationCard') ? decodeLocationCard(item.content) : null;
    const contactCard = item.content?.includes('__contactCard') ? decodeContactCard(item.content) : null;
    const profileCard = item.content?.includes('__profileCard') ? decodeProfileCard(item.content) : null;

    const replyPreviewText = item.replyTo
      ? (parseVemojiMessage(item.replyTo.content) ? '🔥 Vemoji' : (item.replyTo.content || (item.replyTo.mediaUrl ? '📎 Attachment' : '')))
      : '';

    if (locationCard) {
      return (
        <View style={[styles.productBubbleWrap, isMe ? styles.productBubbleMe : styles.productBubbleThem]}>
          <LocationMiniCard
            location={locationCard}
            isMine={isMe}
            onStop={isMe ? stopLiveLocation : undefined}
          />
          <Text style={[styles.metaTime, { alignSelf: isMe ? 'flex-end' : 'flex-start', marginTop: 4 }]}>
            {formatClockTime(item.createdAt)}
          </Text>
        </View>
      );
    }

    if (contactCard) {
      return (
        <View style={[styles.productBubbleWrap, isMe ? styles.productBubbleMe : styles.productBubbleThem]}>
          <ContactMiniCard contact={contactCard} />
          <Text style={[styles.metaTime, { alignSelf: isMe ? 'flex-end' : 'flex-start', marginTop: 4 }]}>
            {formatClockTime(item.createdAt)}
          </Text>
        </View>
      );
    }

    if (profileCard) {
      return (
        <View style={[styles.productBubbleWrap, isMe ? styles.productBubbleMe : styles.productBubbleThem]}>
          <ProfileMiniCard profile={profileCard} navigation={navigation} />
          <Text style={[styles.metaTime, { alignSelf: isMe ? 'flex-end' : 'flex-start', marginTop: 4 }]}>
            {formatClockTime(item.createdAt)}
          </Text>
        </View>
      );
    }

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
        onPress={vemojiType ? () => {
          playSound(vemojiType);
          setEmojiBurst({ type: vemojiType, nonce: Date.now() });
        } : undefined}
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
          {!!item.editedAt && (
            <Text style={[styles.metaTime, isMe && !stickerOnly && styles.metaTimeMine, stickerOnly && styles.metaTimeOnMedia, { marginRight: 4 }]}>
              (edited)
            </Text>
          )}
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
      padding: 0,
      backgroundColor: 'transparent',
      overflow: 'hidden',
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
    // ── Chat Actions tray (the "+" button next to voice) ────────────────
    actionsTraySheet: {
      backgroundColor: COLORS.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 1,
      borderColor: COLORS.border,
      paddingTop: 12,
      paddingBottom: 32,
    },
    actionsTrayHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: COLORS.border,
      alignSelf: 'center',
      marginBottom: 16,
    },
    actionsTrayTitle: {
      color: COLORS.text,
      fontSize: 17,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 22,
    },
    // Capped below the natural 3-row height for today's 9 actions, so the
    // grid already scrolls now — not just once more actions get added.
    actionsGridScroll: {
      maxHeight: 210,
    },
    actionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 24,
    },
    actionItem: {
      width: '33.33%',
      alignItems: 'center',
      gap: 8,
      marginBottom: 28,
    },
    actionItemLabel: {
      color: COLORS.text,
      fontSize: 12.5,
      fontWeight: '600',
    },
    actionGifBadge: {
      borderWidth: 2,
      borderColor: COLORS.textMuted,
      borderRadius: 7,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    actionGifBadgeText: {
      color: COLORS.textMuted,
      fontSize: 14,
      fontWeight: '800',
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
    deletedBubble: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      opacity: 0.7,
    },
    deletedText: {
      color: COLORS.textMuted,
      fontSize: 13,
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
    permissionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    permissionLabel: {
      color: COLORS.text,
      fontSize: 14,
      fontWeight: '600',
    },
    permissionDesc: {
      color: COLORS.textMuted,
      fontSize: 11.5,
      marginTop: 1,
    },
    locationOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    contactSearchInput: {
      backgroundColor: COLORS.surface,
      color: COLORS.text,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 10,
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
                  {isBusy && <View style={[styles.statusDot, { backgroundColor: '#F59E0B' }]} />}
                  <Text style={styles.statusText} numberOfLines={1}>
                    {statusText}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
            <View style={styles.callButtons}>
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

          {editingMessage && (
            <View style={styles.replyBar}>
              <View style={styles.replyBarAccent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.replyBarSender}>Editing message</Text>
                <Text style={styles.replyBarText} numberOfLines={1}>{editingMessage.content}</Text>
              </View>
              <TouchableOpacity onPress={() => { setEditingMessage(null); setInputText(''); }} style={styles.replyBarClose}>
                <Ionicons name="close" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          )}

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

              {/* Opens the Chat Actions tray — every action that used to be
                  its own icon crammed next to the input now lives there
                  (see chatActions below), matching the shared design canvas. */}
              <TouchableOpacity style={styles.sendButton} onPress={() => setShowActionsTray(true)}>
                <Ionicons name="add" size={24} color="#FFF" />
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
        visible={showActionsTray}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActionsTray(false)}
      >
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setShowActionsTray(false)}>
          <View style={styles.actionsTraySheet}>
            <View style={styles.actionsTrayHandle} />
            <Text style={styles.actionsTrayTitle}>Chat Actions</Text>
            <ScrollView style={styles.actionsGridScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.actionsGrid}>
                {chatActions.map(action => (
                  <TouchableOpacity key={action.key} style={styles.actionItem} onPress={action.onPress}>
                    {action.renderIcon()}
                    <Text style={styles.actionItemLabel}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

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
                setEditingMessage(null);
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
            {/* Edit/delete are only offered for a message this caller
                actually owns — either it's really theirs (senderId), or
                they're the delegate who personally sent it while acting as
                the owner (actualSenderId). Server enforces this too. */}
            {!!actionSheetMessage &&
              (actionSheetMessage.senderId === user?.userId || actionSheetMessage.actualSenderId === user?.userId) &&
              !actionSheetMessage.mediaUrl &&
              !parseVemojiMessage(actionSheetMessage.content) && (
                <TouchableOpacity
                  style={styles.actionSheetItem}
                  onPress={() => actionSheetMessage && startEditMessage(actionSheetMessage)}
                >
                  <Ionicons name="create-outline" size={20} color={COLORS.text} />
                  <Text style={styles.actionSheetItemText}>Edit</Text>
                </TouchableOpacity>
              )}
            {!!actionSheetMessage &&
              (actionSheetMessage.senderId === user?.userId || actionSheetMessage.actualSenderId === user?.userId) && (
                <TouchableOpacity
                  style={styles.actionSheetItem}
                  onPress={() => actionSheetMessage && confirmDeleteMessage(actionSheetMessage)}
                >
                  <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                  <Text style={[styles.actionSheetItemText, { color: COLORS.error }]}>Delete</Text>
                </TouchableOpacity>
              )}
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

      <Modal
        visible={showShareModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.forwardSheet}>
            <View style={styles.forwardHeader}>
              <Text style={styles.forwardTitle}>Share this chat</Text>
              <TouchableOpacity onPress={() => setShowShareModal(false)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            {!relationshipPartner ? (
              <Text style={styles.forwardEmpty}>
                You need an active relationship partner before you can share a chat with them.
              </Text>
            ) : (
              <>
                <View style={styles.forwardChatRow}>
                  <Image
                    source={{ uri: relationshipPartner.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${relationshipPartner.username}` }}
                    style={styles.forwardChatAvatar}
                  />
                  <Text style={styles.forwardChatName} numberOfLines={1}>
                    {relationshipPartner.displayName || relationshipPartner.username}
                  </Text>
                  <Ionicons
                    name={isSharedWithPartner ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={isSharedWithPartner ? COLORS.primary : COLORS.textMuted}
                  />
                </View>
                <Text style={[styles.forwardEmpty, { marginTop: 0, marginBottom: 4 }]}>
                  {isSharedWithPartner
                    ? `${relationshipPartner.displayName || relationshipPartner.username} has access to this chat, appearing as you. The other person in this chat is never shown that you shared it. Choose exactly what they can do:`
                    : `Let ${relationshipPartner.displayName || relationshipPartner.username} act in this chat as you. The other person in this chat won't be shown that you shared it. Choose what they can do:`}
                </Text>

                {[
                  { key: 'canRead' as const, label: 'Read messages', desc: 'See the messages in this chat' },
                  { key: 'canWrite' as const, label: 'Send messages', desc: 'Reply, appearing as you' },
                  { key: 'canUpdateMessages' as const, label: 'Edit their sent messages', desc: 'Only messages they personally sent' },
                  { key: 'canDeleteMessages' as const, label: 'Delete their sent messages', desc: 'Only messages they personally sent' },
                ].map(perm => (
                  <View key={perm.key} style={styles.permissionRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.permissionLabel}>{perm.label}</Text>
                      <Text style={styles.permissionDesc}>{perm.desc}</Text>
                    </View>
                    <Switch
                      value={sharePermissions[perm.key]}
                      onValueChange={(val) => setSharePermissions(prev => ({ ...prev, [perm.key]: val }))}
                      trackColor={{ false: COLORS.border, true: COLORS.primaryDeep }}
                      thumbColor={sharePermissions[perm.key] ? COLORS.primary : COLORS.textMuted}
                    />
                  </View>
                ))}

                <TouchableOpacity
                  style={[styles.forwardConfirmBtn, shareBusy && { opacity: 0.5 }, { marginTop: 14 }]}
                  onPress={applySharePermissions}
                  disabled={shareBusy}
                >
                  {shareBusy ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.forwardConfirmText}>
                      {isSharedWithPartner ? 'Update permissions' : 'Share with partner'}
                    </Text>
                  )}
                </TouchableOpacity>
                {isSharedWithPartner && (
                  <TouchableOpacity
                    style={[styles.forwardConfirmBtn, shareBusy && { opacity: 0.5 }, { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginTop: 8 }]}
                    onPress={stopSharingWithPartner}
                    disabled={shareBusy}
                  >
                    <Text style={[styles.forwardConfirmText, { color: COLORS.text }]}>Stop sharing</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showLocationSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocationSheet(false)}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.forwardSheet}>
            <View style={styles.forwardHeader}>
              <Text style={styles.forwardTitle}>Share location</Text>
              <TouchableOpacity onPress={() => setShowLocationSheet(false)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            {sharingLocation ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 30 }} />
            ) : (
              <>
                <TouchableOpacity style={styles.locationOption} onPress={() => shareLocation(null)}>
                  <Ionicons name="location" size={20} color={COLORS.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.permissionLabel}>Share current location</Text>
                    <Text style={styles.permissionDesc}>A one-time pin of where you are right now</Text>
                  </View>
                </TouchableOpacity>
                {[15, 60, 480].map((mins) => (
                  <TouchableOpacity key={mins} style={styles.locationOption} onPress={() => shareLocation(mins)}>
                    <Ionicons name="navigate" size={20} color="#3B82F6" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.permissionLabel}>
                        Share live location for {mins < 60 ? `${mins} min` : `${mins / 60} ${mins === 60 ? 'hour' : 'hours'}`}
                      </Text>
                      <Text style={styles.permissionDesc}>Keeps updating while this chat stays open</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showContactPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowContactPicker(false)}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.forwardSheet}>
            <View style={styles.forwardHeader}>
              <Text style={styles.forwardTitle}>Share a contact</Text>
              <TouchableOpacity onPress={() => setShowContactPicker(false)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.contactSearchInput}
              placeholder="Search contacts…"
              placeholderTextColor={COLORS.textMuted}
              value={contactQuery}
              onChangeText={onContactQueryChange}
            />
            {contactSearching ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView style={{ maxHeight: 320 }}>
                {contactResults.length === 0 ? (
                  <Text style={styles.forwardEmpty}>No contacts found.</Text>
                ) : (
                  contactResults.map((c, i) => (
                    <TouchableOpacity key={i} style={styles.forwardChatRow} onPress={() => sendContactCard(c)}>
                      <View style={[styles.forwardChatAvatar, { alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="person" size={18} color={COLORS.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.forwardChatName} numberOfLines={1}>{c.name}</Text>
                        <Text style={styles.permissionDesc} numberOfLines={1}>{c.phoneNumbers[0]}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

