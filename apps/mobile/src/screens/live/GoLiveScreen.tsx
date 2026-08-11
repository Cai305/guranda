import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, GRADIENTS } from '../../theme';
import { LIVE_CATEGORIES, getLiveCategory } from '../../config/liveCategories';
import { goLive, inviteGuest } from '../../data/liveApi';
import { getFriends } from '../../data/liveCategoryApi';

type Friend = { id: string; username: string; profile?: { displayName?: string } | null };

export default function GoLiveScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('social');
  const [conversationTopic, setConversationTopic] = useState('');
  const [scheduled, setScheduled] = useState(false);
  const [scheduleWhen, setScheduleWhen] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [invitedGuests, setInvitedGuests] = useState<string[]>([]);
  const [moderatorsOn, setModeratorsOn] = useState(false);
  const [starting, setStarting] = useState(false);

  const category = getLiveCategory(categoryId);
  const availableCategories = LIVE_CATEGORIES.filter(c => c.status === 'live');

  useEffect(() => {
    // /friends returns [{friendshipId, user: {id, username, profile}}] —
    // flatten to the {id, username, profile} shape this screen renders.
    getFriends()
      .then((rows: any[]) => setFriends(rows.map((r) => r.user)))
      .catch(() => setFriends([]))
      .finally(() => setLoadingFriends(false));
  }, []);

  const toggleGuest = (id: string) => {
    setInvitedGuests(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const startStreaming = async () => {
    if (!title.trim()) {
      Alert.alert('Add a title', 'Give your stream a title before going live.');
      return;
    }
    if (scheduled) {
      Alert.alert('Stream scheduled', `"${title}" is scheduled for ${scheduleWhen || 'later'}. We'll notify your followers.`);
      navigation.goBack();
      return;
    }

    // Real camera streaming only runs on web today (see LiveHostScreen).
    // On native we still open the host studio in its honest preview mode.
    if (Platform.OS !== 'web') {
      navigation.replace('LiveHost', { title: title.trim(), categoryId, moderatorsOn });
      return;
    }

    setStarting(true);
    try {
      const room = await goLive(title.trim(), categoryId, categoryId === 'conversation' ? conversationTopic.trim() : undefined);
      // Best-effort — a friend who unfriended you between selecting them
      // and going live shouldn't block the stream from starting.
      await Promise.allSettled(invitedGuests.map((guestId) => inviteGuest(room.id, guestId)));
      navigation.replace('LiveHost', {
        roomId: room.id,
        roomName: room.roomName,
        token: room.token,
        wsUrl: room.wsUrl,
        title: room.title,
        categoryId: room.categoryId,
        moderatorsOn,
      });
    } catch (e: any) {
      Alert.alert('Could not go live', e.message || 'Please try again.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={TYPOGRAPHY.h3}>Go Live</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Thumbnail preview */}
        <LinearGradient colors={category?.gradient || GRADIENTS.live} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.preview}>
          <Ionicons name={category?.icon as any || 'radio'} size={48} color="rgba(255,255,255,0.5)" />
          <Text style={styles.previewTitle} numberOfLines={2}>{title || 'Your stream title'}</Text>
        </LinearGradient>

        <View style={styles.card}>
          <Text style={styles.label}>Stream Title</Text>
          <TextInput
            style={styles.input}
            placeholder="What's happening?"
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryGrid}>
            {availableCategories.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.categoryChip, categoryId === c.id && styles.categoryChipActive]}
                onPress={() => setCategoryId(c.id)}
              >
                <Ionicons name={c.icon as any} size={14} color={categoryId === c.id ? '#FFF' : COLORS.textMuted} />
                <Text style={[styles.categoryChipText, categoryId === c.id && styles.categoryChipTextActive]}>
                  {c.name.replace(' Live', '')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {categoryId === 'conversation' && (
          <View style={styles.card}>
            <Text style={styles.label}>Topic</Text>
            <Text style={styles.hint}>Banter, Politics, Relationships — whatever you're talking about. You can change this any time once you're live.</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Relationship red flags"
              placeholderTextColor={COLORS.textMuted}
              value={conversationTopic}
              onChangeText={setConversationTopic}
            />
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Schedule for later</Text>
            <TouchableOpacity
              style={[styles.toggle, scheduled && styles.toggleOn]}
              onPress={() => setScheduled(s => !s)}
            >
              <View style={[styles.toggleKnob, scheduled && styles.toggleKnobOn]} />
            </TouchableOpacity>
          </View>
          {scheduled && (
            <TextInput
              style={[styles.input, { marginTop: SPACING.md }]}
              placeholder="e.g. Tomorrow, 18:00"
              placeholderTextColor={COLORS.textMuted}
              value={scheduleWhen}
              onChangeText={setScheduleWhen}
            />
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Invite Guests</Text>
          <Text style={styles.hint}>Guests appear on screen once multi-guest streaming is live.</Text>
          {loadingFriends ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: SPACING.md }} />
          ) : friends.length === 0 ? (
            <Text style={styles.hint}>Add friends to invite them to your stream.</Text>
          ) : (
            friends.map(f => {
              const selected = invitedGuests.includes(f.id);
              const name = f.profile?.displayName || f.username;
              return (
                <TouchableOpacity key={f.id} style={styles.friendRow} onPress={() => toggleGuest(f.id)}>
                  <View style={styles.friendAvatar}>
                    <Text style={styles.friendInitial}>{name[0]?.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.friendName}>{name}</Text>
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={selected ? COLORS.primary : COLORS.textMuted}
                  />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Enable Moderators</Text>
            <TouchableOpacity
              style={[styles.toggle, moderatorsOn && styles.toggleOn]}
              onPress={() => setModeratorsOn(m => !m)}
            >
              <View style={[styles.toggleKnob, moderatorsOn && styles.toggleKnobOn]} />
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>Lets you assign moderators once live, who can mute, kick, and ban viewers from the stream.</Text>
        </View>

        <TouchableOpacity activeOpacity={0.85} onPress={startStreaming} disabled={starting} style={{ marginHorizontal: SPACING.lg }}>
          <LinearGradient colors={GRADIENTS.live} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.startBtn, starting && { opacity: 0.7 }]}>
            {starting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="radio" size={18} color="#FFF" />
                <Text style={styles.startBtnText}>{scheduled ? 'Schedule Stream' : 'Start Streaming Now'}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  preview: {
    marginHorizontal: SPACING.lg,
    height: 160,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  previewTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
  },
  card: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  label: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  hint: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    marginBottom: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    padding: 12,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#FFF',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    padding: 2,
  },
  toggleOn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.textMuted,
  },
  toggleKnobOn: {
    backgroundColor: '#FFF',
    alignSelf: 'flex-end',
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  friendAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendInitial: {
    color: COLORS.text,
    fontWeight: '700',
  },
  friendName: {
    color: COLORS.text,
    flex: 1,
    fontSize: 14,
  },
  startBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: RADIUS.md,
  },
  startBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
