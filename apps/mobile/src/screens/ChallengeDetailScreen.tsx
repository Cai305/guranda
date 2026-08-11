import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, Image, ActivityIndicator,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import PlatformWidget from '../components/widgets/PlatformWidget';
import { decodePlatformWidget } from '../components/widgets/platformWidget';

function EntryMedia({ mediaUrl, mediaType, style }: { mediaUrl: string; mediaType?: string; style: any }) {
  const isVideo = mediaType === 'VIDEO';
  const player = useVideoPlayer(isVideo ? mediaUrl : null, p => { p.loop = false; });
  if (isVideo) return <VideoView style={style} player={player} contentFit="cover" nativeControls />;
  return <Image source={{ uri: mediaUrl }} style={style} resizeMode="cover" />;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function ChallengeDetailScreen({ route, navigation }: any) {
  const { challengeId } = route.params;
  const { user } = useAuth();
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;

  const [challenge, setChallenge] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING, RADIUS }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    backBtn: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h3, flex: 1, textAlign: 'center' },

    listContent: { padding: SPACING.lg, paddingBottom: 80 },

    infoCard: {
      backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.border,
      overflow: 'hidden', marginBottom: SPACING.lg,
    },
    coverImage: { width: '100%', height: 180 },
    description: { color: COLORS.text, fontSize: 14, lineHeight: 20, padding: SPACING.md },
    prompt: { color: COLORS.textMuted, fontStyle: 'italic', fontSize: 13, paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
    metaChip: {
      flexDirection: 'row', alignItems: 'center', gap: 3,
      backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.sm,
      paddingHorizontal: 10, paddingVertical: 4,
    },
    metaChipText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
    sponsorText: { color: COLORS.textMuted, fontSize: 12, paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
    submitBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: COLORS.primary, margin: SPACING.md, borderRadius: RADIUS.md,
      paddingVertical: 12,
    },
    submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    submittedBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center',
      margin: SPACING.md, padding: 10,
      backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.md,
    },
    submittedText: { color: COLORS.textMuted, fontSize: 13 },
    entriesLabel: { ...TYPOGRAPHY.label, padding: SPACING.md, paddingBottom: SPACING.sm },

    // Entry grid cards
    entryCard: {
      flex: 1, maxWidth: '48%', backgroundColor: COLORS.surface,
      borderRadius: RADIUS.md, overflow: 'hidden',
      borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm,
    },
    entryThumb: { width: '100%', aspectRatio: 1 },
    winnerBadge: {
      position: 'absolute', top: 6, right: 6,
      backgroundColor: COLORS.gold, borderRadius: 10, padding: 4,
    },
    entryMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 },
    entryAvatar: { width: 22, height: 22, borderRadius: 11 },
    entryAuthor: { color: COLORS.text, fontSize: 11, fontWeight: '600', flex: 1 },
    entryStatsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 8, paddingBottom: 8 },
    entryStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    entryStatText: { color: COLORS.textMuted, fontSize: 11 },

    // Modal
    modalMedia: { width: '100%', aspectRatio: 1, backgroundColor: COLORS.surface },
    modalCaption: { color: COLORS.text, fontSize: 14, padding: SPACING.md },
    modalActionsRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
      borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    modalActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    modalActionText: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
    commentsLabel: { ...TYPOGRAPHY.label, fontSize: 11 },
    voteRow: { padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    voteLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 8 },
    voteButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    voteNum: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
      textAlign: 'center', lineHeight: 36,
      color: COLORS.text, fontSize: 14, fontWeight: '600',
    },
    voteNumActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary, color: '#fff' },

    // Comments
    commentRow: { flexDirection: 'row', gap: 10, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
    commentAvatar: { width: 30, height: 30, borderRadius: 15 },
    commentAuthor: { color: COLORS.text, fontSize: 13, fontWeight: '700', marginBottom: 2 },
    commentText: { color: COLORS.text, fontSize: 13, lineHeight: 18 },
    commentTime: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },

    inputContainer: {
      flexDirection: 'row', alignItems: 'flex-end', gap: 8,
      padding: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border,
      backgroundColor: COLORS.background,
    },
    input: {
      flex: 1, backgroundColor: COLORS.surface, color: COLORS.text,
      borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
      padding: 10, fontSize: 14, maxHeight: 100,
    },
    postBtn: { padding: 8 },

    emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
    emptyText: { color: COLORS.textMuted, fontSize: 14 },
  }));

  const fetchChallenge = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchApi(`/challenges/${challengeId}`);
      if (res.ok) setChallenge(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [challengeId]);

  useFocusEffect(useCallback(() => { fetchChallenge(); }, [fetchChallenge]));

  const myEntry = challenge?.entries?.find((e: any) => e.userId === user?.userId);
  const canSubmit = challenge?.status === 'ACTIVE' && !myEntry;

  const openEntry = async (entry: any) => {
    setSelectedEntry(entry);
    const res = await fetchApi(`/challenges/entries/${entry.id}/comments`);
    if (res.ok) setComments(await res.json());
  };

  const closeEntry = () => {
    setSelectedEntry(null);
    setComments([]);
    setCommentText('');
  };

  const toggleLike = async (entry: any) => {
    setSelectedEntry((prev: any) =>
      prev && prev.id === entry.id
        ? { ...prev, isLikedByMe: !prev.isLikedByMe, likeCount: prev.likeCount + (prev.isLikedByMe ? -1 : 1) }
        : prev,
    );
    setChallenge((prev: any) =>
      !prev ? prev : {
        ...prev,
        entries: prev.entries.map((e: any) =>
          e.id === entry.id
            ? { ...e, isLikedByMe: !e.isLikedByMe, likeCount: e.likeCount + (e.isLikedByMe ? -1 : 1) }
            : e,
        ),
      },
    );
    try {
      const res = await fetchApi(`/challenges/entries/${entry.id}/like`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to like');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', "Couldn't update your like. Please try again.");
      fetchChallenge();
    }
  };

  const vote = async (entry: any, value: number) => {
    try {
      const res = await fetchApi(`/challenges/entries/${entry.id}/vote`, { method: 'POST', body: JSON.stringify({ value }) });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Failed to vote');
      }
      fetchChallenge();
      setSelectedEntry((prev: any) => prev && prev.id === entry.id ? { ...prev, myVote: value } : prev);
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e.message || "Couldn't submit your vote.");
    }
  };

  const postComment = async () => {
    if (!commentText.trim() || !selectedEntry || posting) return;
    setPosting(true);
    try {
      const res = await fetchApi(`/challenges/entries/${selectedEntry.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: commentText.trim() }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments(prev => [...prev, newComment]);
        setCommentText('');
      } else {
        const data = await res.json().catch(() => null);
        Alert.alert('Error', data?.message || "Couldn't post your comment.");
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', "Couldn't post your comment.");
    } finally {
      setPosting(false);
    }
  };

  if (loading && !challenge) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!challenge) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyText}>Challenge not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[TYPOGRAPHY.h3, { flex: 1, textAlign: 'center' }]} numberOfLines={1}>
          {challenge.title}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={challenge.entries ?? []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={fetchChallenge}
        ListHeaderComponent={
          <View style={styles.infoCard}>
            {!!challenge.coverImageUrl && (
              <Image source={{ uri: challenge.coverImageUrl }} style={styles.coverImage} resizeMode="cover" />
            )}
            <Text style={styles.description}>{challenge.description}</Text>
            {!!challenge.promptText && <Text style={styles.prompt}>"{challenge.promptText}"</Text>}
            <View style={styles.metaRow}>
              <View style={styles.metaChip}><Text style={styles.metaChipText}>{challenge.category}</Text></View>
              <View style={styles.metaChip}><Text style={styles.metaChipText}>{challenge.type}</Text></View>
              <View style={styles.metaChip}>
                <Ionicons name="flash" size={12} color={COLORS.gold} />
                <Text style={[styles.metaChipText, { color: COLORS.gold }]}> {challenge.xpReward} XP</Text>
              </View>
            </View>
            {!!challenge.sponsorLabel && (
              <Text style={styles.sponsorText}>Sponsored by {challenge.sponsorLabel}</Text>
            )}

            {canSubmit ? (
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={() => navigation.navigate('SubmitChallengeEntry', { challengeId, challengeTitle: challenge.title })}
              >
                <Ionicons name="add-circle" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Submit Your Entry</Text>
              </TouchableOpacity>
            ) : myEntry ? (
              <View style={styles.submittedBanner}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                <Text style={styles.submittedText}>You've submitted an entry</Text>
              </View>
            ) : challenge.status === 'ENDED' ? (
              <View style={styles.submittedBanner}>
                <Ionicons name="flag" size={16} color={COLORS.textMuted} />
                <Text style={styles.submittedText}>This challenge has ended</Text>
              </View>
            ) : null}

            <Text style={styles.entriesLabel}>Entries ({challenge.entries?.length ?? 0})</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.entryCard} activeOpacity={0.85} onPress={() => openEntry(item)}>
            <EntryMedia mediaUrl={item.mediaUrl} mediaType={item.mediaType} style={styles.entryThumb} />
            {item.id === challenge.winningEntryId && (
              <View style={styles.winnerBadge}>
                <Ionicons name="trophy" size={12} color="#1A1A1A" />
              </View>
            )}
            <View style={styles.entryMetaRow}>
              <Image
                source={{ uri: item.user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${item.user?.username}` }}
                style={styles.entryAvatar}
              />
              <Text style={styles.entryAuthor} numberOfLines={1}>
                {item.user?.displayName || item.user?.username}
              </Text>
            </View>
            <View style={styles.entryStatsRow}>
              <View style={styles.entryStat}>
                <Ionicons name={item.isLikedByMe ? 'heart' : 'heart-outline'} size={13} color={item.isLikedByMe ? '#F43F5E' : COLORS.textMuted} />
                <Text style={styles.entryStatText}>{item.likeCount}</Text>
              </View>
              <View style={styles.entryStat}>
                <Ionicons name="star" size={13} color={COLORS.gold} />
                <Text style={styles.entryStatText}>{item.voteAverage ? item.voteAverage.toFixed(1) : '—'}</Text>
              </View>
              <View style={styles.entryStat}>
                <Ionicons name="chatbubble-outline" size={13} color={COLORS.textMuted} />
                <Text style={styles.entryStatText}>{item.commentCount}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="images-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No entries yet — be the first!</Text>
            </View>
          ) : null
        }
      />

      {/* Entry detail modal */}
      <Modal visible={!!selectedEntry} animationType="slide" onRequestClose={closeEntry}>
        {selectedEntry && (
          <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={90}
            >
              <View style={styles.header}>
                <TouchableOpacity onPress={closeEntry} style={styles.backBtn}>
                  <Ionicons name="close" size={26} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={[TYPOGRAPHY.h3, { flex: 1, textAlign: 'center' }]}>Entry</Text>
                <View style={{ width: 24 }} />
              </View>

              <FlatList
                data={comments}
                keyExtractor={(c) => c.id}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => (
                  <View style={styles.commentRow}>
                    <Image
                      source={{ uri: item.author?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${item.author?.username}` }}
                      style={styles.commentAvatar}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.commentAuthor}>{item.author?.displayName || item.author?.username}</Text>
                      {decodePlatformWidget(item.content) ? <PlatformWidget widget={decodePlatformWidget(item.content)!} navigation={navigation} compact /> : <Text style={styles.commentText}>{item.content}</Text>}
                      <Text style={styles.commentTime}>{timeAgo(item.createdAt)}</Text>
                    </View>
                  </View>
                )}
                ListHeaderComponent={
                  <View>
                    <EntryMedia mediaUrl={selectedEntry.mediaUrl} mediaType={selectedEntry.mediaType} style={styles.modalMedia} />
                    {!!selectedEntry.caption && <Text style={styles.modalCaption}>{selectedEntry.caption}</Text>}
                    <View style={styles.modalActionsRow}>
                      <TouchableOpacity style={styles.modalActionBtn} onPress={() => toggleLike(selectedEntry)}>
                        <Ionicons
                          name={selectedEntry.isLikedByMe ? 'heart' : 'heart-outline'}
                          size={22}
                          color={selectedEntry.isLikedByMe ? '#F43F5E' : COLORS.text}
                        />
                        <Text style={styles.modalActionText}>{selectedEntry.likeCount}</Text>
                      </TouchableOpacity>
                      <Text style={styles.commentsLabel}>Comments</Text>
                    </View>

                    {selectedEntry.userId !== user?.userId && (
                      <View style={styles.voteRow}>
                        <Text style={styles.voteLabel}>Rate this entry</Text>
                        <View style={styles.voteButtons}>
                          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                            <TouchableOpacity key={n} onPress={() => vote(selectedEntry, n)}>
                              <Text style={[styles.voteNum, selectedEntry.myVote === n && styles.voteNumActive]}>{n}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                }
              />

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Write a comment…"
                  placeholderTextColor={COLORS.textMuted}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                />
                <TouchableOpacity
                  style={styles.postBtn}
                  onPress={postComment}
                  disabled={!commentText.trim() || posting}
                >
                  <Ionicons
                    name="send"
                    size={20}
                    color={!commentText.trim() || posting ? COLORS.textMuted : COLORS.primary}
                  />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}
