import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, FlatList, ActivityIndicator,
  TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import PlatformWidget from '../components/widgets/PlatformWidget';
import { decodePlatformWidget } from '../components/widgets/platformWidget';
import { useAuth } from '../context/AuthContext';
import GiftButton from '../components/gifts/GiftButton';

const CATEGORY_GRADIENT: Record<string, [string, string]> = {
  DANCE: ['#DB2777', '#831843'], COMEDY: ['#EA580C', '#7C2D12'],
  FITNESS: ['#E11D48', '#881337'], GAMING: ['#7C3AED', '#4C1D95'],
  PHOTOGRAPHY: ['#0891B2', '#164E63'], COOKING: ['#D97706', '#78350F'],
  BUSINESS: ['#15803D', '#14532D'], MUSIC: ['#DB2777', '#831843'],
  LIFESTYLE: ['#9333EA', '#581C87'], SPORTS: ['#16A34A', '#14532D'],
  COUPLES: ['#F43F5E', '#881337'], SPONSORED: ['#CA8A04', '#713F12'],
};
const CATEGORY_ICON: Record<string, string> = {
  DANCE: 'body', COMEDY: 'happy', FITNESS: 'barbell', GAMING: 'game-controller',
  PHOTOGRAPHY: 'camera', COOKING: 'restaurant', BUSINESS: 'briefcase',
  MUSIC: 'musical-notes', LIFESTYLE: 'sparkles', SPORTS: 'football',
  COUPLES: 'heart', SPONSORED: 'ribbon',
};
const CATEGORIES = [
  'ALL', 'DANCE', 'COMEDY', 'FITNESS', 'GAMING', 'PHOTOGRAPHY',
  'COOKING', 'BUSINESS', 'MUSIC', 'LIFESTYLE', 'SPORTS', 'COUPLES', 'SPONSORED',
];
const SCOPES = ['ALL', 'LOCAL', 'DISTRICT', 'PROVINCIAL', 'NATIONAL'];
const SCOPE_ICON: Record<string, string> = {
  ALL: 'earth', LOCAL: 'location', DISTRICT: 'map', PROVINCIAL: 'flag', NATIONAL: 'globe',
};

interface FeedEntry {
  id: string; mediaUrl: string; mediaType: string; caption?: string | null;
  createdAt: string; score: number; totalEntries: number;
  user: { id: string; username: string; displayName?: string | null; avatarUrl?: string | null };
  challenge: { id: string; title: string; category: string; type: string; xpReward: number; scope: string; location?: string | null };
  likeCount: number; isLikedByMe: boolean;
  voteCount: number; voteAverage: number; myVote: number | null;
  commentCount: number;
}
interface EntryStats {
  score: number; globalRank: number; globalTotal: number;
  categoryRank: number; categoryTotal: number;
  challengeLeaderboard: Array<{ id: string; score: number; likeCount: number; voteAverage: number; user: any }>;
}
interface Comment {
  id: string; content: string; boostAmount: number; boostedAt?: string | null;
  author: { id: string; username: string; displayName?: string | null; avatarUrl?: string | null };
  createdAt: string;
}

function EntryVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.play(); });
  return <VideoView style={{ width: '100%', height: 340 }} player={player} contentFit="cover" nativeControls={false} />;
}

function EntryCard({ entry, onLike, onComment, onVote, navigation }: {
  entry: FeedEntry;
  onLike: (e: FeedEntry) => void;
  onComment: (e: FeedEntry) => void;
  onVote: (e: FeedEntry) => void;
  navigation: any;
}) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const isVideo = entry.mediaType === 'VIDEO';
  const grad = (CATEGORY_GRADIENT[entry.challenge.category] ?? ['#1E293B', '#0F172A']) as [string, string];
  const catIcon = (CATEGORY_ICON[entry.challenge.category] ?? 'star') as any;
  const scopeIcon = (SCOPE_ICON[entry.challenge.scope] ?? 'earth') as any;
  const avatar = entry.user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${entry.user.username}`;

  return (
    <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, overflow: 'hidden', marginBottom: 14, borderWidth: 1, borderColor: COLORS.border }}>
      <View>
        {isVideo ? <EntryVideo uri={entry.mediaUrl} /> : <Image source={{ uri: entry.mediaUrl }} style={{ width: '100%', height: 340 }} resizeMode="cover" />}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.82)']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 140 }} />
        <View style={{ position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name={scopeIcon} size={10} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{entry.challenge.scope}{entry.challenge.location ? ` · ${entry.challenge.location}` : ''}</Text>
          </View>
          {entry.totalEntries > 0 && (
            <View style={{ marginLeft: 'auto' as any, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="trophy" size={10} color={COLORS.gold} />
              <Text style={{ color: COLORS.gold, fontSize: 10, fontWeight: '800' }}>Score {entry.score}</Text>
            </View>
          )}
        </View>
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12 }}>
          <TouchableOpacity onPress={() => navigation.navigate('ChallengeDetail', { challengeId: entry.challenge.id })} activeOpacity={0.85} style={{ alignSelf: 'flex-start', borderRadius: 20, overflow: 'hidden', marginBottom: 6 }}>
            <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
              <Ionicons name={catIcon} size={11} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }} numberOfLines={1}>#{entry.challenge.title}</Text>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{entry.challenge.xpReward} XP</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={() => navigation?.navigate('Profile', { userId: entry.user.id })}>
              <Image source={{ uri: avatar }} style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: '#fff' }} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>@{entry.user.username}</Text>
              {!!entry.caption && <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }} numberOfLines={1}>{entry.caption}</Text>}
            </View>
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 16 }}>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} onPress={() => onLike(entry)}>
          <Ionicons name={entry.isLikedByMe ? 'heart' : 'heart-outline'} size={22} color={entry.isLikedByMe ? '#F43F5E' : COLORS.textMuted} />
          <Text style={{ color: entry.isLikedByMe ? '#F43F5E' : COLORS.textMuted, fontSize: 13, fontWeight: '600' }}>{entry.likeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} onPress={() => onComment(entry)}>
          <Ionicons name="chatbubble-outline" size={20} color={COLORS.textMuted} />
          <Text style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: '600' }}>{entry.commentCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} onPress={() => onVote(entry)} disabled={entry.myVote !== null}>
          <Ionicons name="star" size={20} color={entry.myVote ? COLORS.gold : COLORS.textMuted} />
          <Text style={{ color: entry.myVote ? COLORS.gold : COLORS.textMuted, fontSize: 13, fontWeight: '600' }}>{entry.voteAverage > 0 ? entry.voteAverage.toFixed(1) : 'Rate'}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <GiftButton recipientId={entry.user.id} recipientName={entry.user.displayName || entry.user.username} context="video" contextId={entry.id} size={32} />
      </View>
    </View>
  );
}

function BoostModal({ comment, onClose, onBoosted }: { comment: Comment | null; onClose: () => void; onBoosted: (c: Comment) => void }) {
  const { theme } = useTheme();
  const { COLORS, RADIUS, SPACING } = theme;
  const [amount, setAmount] = useState('10');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!comment || busy) return;
    const mshAmount = parseFloat(amount);
    if (!(mshAmount > 0)) { Alert.alert('Invalid amount'); return; }
    setBusy(true);
    try {
      const res = await fetchApi(`/challenges/entries/${comment.id}/boost`, { method: 'POST', body: JSON.stringify({ mshAmount }) });
      if (res.ok) {
        const updated = await res.json();
        onBoosted(updated);
        onClose();
        Alert.alert('Boosted! 🚀', `Comment pinned with ${mshAmount} MSH`);
      } else {
        const d = await res.json().catch(() => ({}));
        Alert.alert('Failed', (d as any).message || 'Please try again');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={!!comment} animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.xl, padding: SPACING.lg }}>
          <Text style={{ color: COLORS.text, fontWeight: '800', fontSize: 16, marginBottom: 4 }}>Boost Comment 🚀</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 12, marginBottom: 16 }}>Pay MSH to pin this comment to the top. More boost = higher position.</Text>
          <TextInput style={{ backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: 12, color: COLORS.text, fontSize: 16, marginBottom: 16 }} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="MSH amount" placeholderTextColor={COLORS.textMuted} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={{ flex: 1, padding: 13, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' }} onPress={onClose}>
              <Text style={{ color: COLORS.textMuted, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex: 1, padding: 13, borderRadius: RADIUS.pill, backgroundColor: COLORS.gold, alignItems: 'center' }} onPress={submit} disabled={busy}>
              {busy ? <ActivityIndicator color="#000" /> : <Text style={{ color: '#000', fontWeight: '800' }}>Boost · {amount} MSH</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function CommentSheet({ entry, onClose, currentUserId }: { entry: FeedEntry | null; onClose: () => void; currentUserId?: string }) {
  const { theme } = useTheme();
  const { COLORS, RADIUS, SPACING } = theme;
  const [tab, setTab] = useState<'stats' | 'comments'>('stats');
  const [stats, setStats] = useState<EntryStats | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [boostTarget, setBoostTarget] = useState<Comment | null>(null);

  React.useEffect(() => {
    if (!entry) { setStats(null); setComments([]); return; }
    setLoadingStats(true);
    fetchApi(`/challenges/entries/${entry.id}/stats`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setStats(d); })
      .catch(() => {})
      .finally(() => setLoadingStats(false));
    setLoadingComments(true);
    fetchApi(`/challenges/entries/${entry.id}/comments`)
      .then((r) => r.ok ? r.json() : [])
      .then((d) => { if (Array.isArray(d)) setComments(d); })
      .catch(() => {})
      .finally(() => setLoadingComments(false));
  }, [entry?.id]);

  const postComment = async () => {
    if (!entry || !text.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetchApi(`/challenges/entries/${entry.id}/comments`, { method: 'POST', body: JSON.stringify({ content: text.trim() }) });
      if (res.ok) { const c = await res.json(); setComments((prev) => [c, ...prev]); setText(''); }
    } catch {
      // silent
    } finally {
      setPosting(false);
    }
  };

  const handleBoosted = (updated: Comment) => {
    setComments((prev) => [updated, ...prev.filter((c) => c.id !== updated.id)]);
  };

  const StatRow = ({ label, value, gold }: { label: string; value: string; gold?: boolean }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
      <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: gold ? COLORS.gold : COLORS.text, fontWeight: '700', fontSize: 13 }}>{value}</Text>
    </View>
  );

  return (
    <>
      <BoostModal comment={boostTarget} onClose={() => setBoostTarget(null)} onBoosted={handleBoosted} />
      <Modal visible={!!entry} animationType="slide" transparent onRequestClose={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
          <View style={{ backgroundColor: COLORS.surfaceElevated, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, maxHeight: '80%', borderWidth: 1, borderBottomWidth: 0, borderColor: COLORS.glassBorder }}>
            <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 2 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border }} />
            </View>
            <View style={{ flexDirection: 'row', paddingHorizontal: SPACING.lg, paddingBottom: 8, gap: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
              {(['stats', 'comments'] as const).map((t) => (
                <TouchableOpacity key={t} onPress={() => setTab(t)} style={{ paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: tab === t ? COLORS.primary : 'transparent' }}>
                  <Text style={{ color: tab === t ? COLORS.text : COLORS.textMuted, fontWeight: '700', fontSize: 14 }}>{t === 'stats' ? '📊 Stats' : '💬 Comments'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {tab === 'stats' ? (
              <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 32 }}>
                {loadingStats ? (
                  <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 24 }} />
                ) : !stats ? (
                  <Text style={{ color: COLORS.textMuted, textAlign: 'center', marginVertical: 24 }}>No stats yet</Text>
                ) : (
                  <>
                    <Text style={{ color: COLORS.text, fontWeight: '800', fontSize: 15, marginBottom: 12 }}>Performance</Text>
                    <StatRow label="Score" value={`${stats.score} pts`} gold />
                    <StatRow label="Global Rank" value={`#${stats.globalRank} of ${stats.globalTotal}`} gold />
                    <StatRow label="Category Rank" value={`#${stats.categoryRank} of ${stats.categoryTotal}`} />
                    <StatRow label="Likes" value={`${stats.likeCount}`} />
                    <StatRow label="Avg Rating" value={`${stats.voteAverage}/10`} />
                    <StatRow label="Comments" value={`${stats.commentCount}`} />
                    <Text style={{ color: COLORS.text, fontWeight: '800', fontSize: 15, marginTop: 20, marginBottom: 10 }}>🏆 Challenge Leaderboard</Text>
                    {stats.challengeLeaderboard.map((row, idx) => (
                      <View key={row.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                        <Text style={{ color: idx === 0 ? COLORS.gold : COLORS.textMuted, fontWeight: '800', fontSize: 14, width: 24 }}>#{idx + 1}</Text>
                        <Image source={{ uri: row.user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${row.user?.username}` }} style={{ width: 28, height: 28, borderRadius: 14 }} />
                        <Text style={{ color: COLORS.text, fontWeight: '700', fontSize: 12, flex: 1 }}>{row.user?.displayName || row.user?.username}</Text>
                        <Text style={{ color: COLORS.gold, fontWeight: '800', fontSize: 12 }}>{row.score} pts</Text>
                      </View>
                    ))}
                  </>
                )}
              </ScrollView>
            ) : (
              <>
                <FlatList
                  data={comments}
                  keyExtractor={(c) => c.id}
                  style={{ maxHeight: 380 }}
                  contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 8 }}
                  ListEmptyComponent={
                    loadingComments
                      ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 24 }} />
                      : <Text style={{ color: COLORS.textMuted, textAlign: 'center', paddingVertical: 24 }}>No comments yet</Text>
                  }
                  renderItem={({ item }) => {
                    const isPaid = item.boostAmount > 0;
                    const isOwn = item.author?.id === currentUserId;
                    return (
                      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                        <Image source={{ uri: item.author?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${item.author?.username}` }} style={{ width: 32, height: 32, borderRadius: 16 }} />
                        <View style={{ flex: 1, backgroundColor: isPaid ? 'rgba(251,191,36,0.07)' : 'transparent', borderRadius: 10, padding: isPaid ? 8 : 0, borderWidth: isPaid ? 1 : 0, borderColor: isPaid ? 'rgba(251,191,36,0.3)' : 'transparent' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <Text style={{ color: COLORS.text, fontWeight: '700', fontSize: 13 }}>{item.author?.displayName || item.author?.username}</Text>
                            {isPaid && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(251,191,36,0.15)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                                <Ionicons name="rocket" size={9} color={COLORS.gold} />
                                <Text style={{ color: COLORS.gold, fontSize: 9, fontWeight: '800' }}>{item.boostAmount} MSH</Text>
                              </View>
                            )}
                          </View>
                          {decodePlatformWidget(item.content) ? <PlatformWidget widget={decodePlatformWidget(item.content)!} compact /> : <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>{item.content}</Text>}
                          {isOwn && !isPaid && (
                            <TouchableOpacity onPress={() => setBoostTarget(item)} style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Ionicons name="rocket-outline" size={12} color={COLORS.gold} />
                              <Text style={{ color: COLORS.gold, fontSize: 11, fontWeight: '700' }}>Boost to top</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  }}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: SPACING.lg, paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border }}>
                  <TextInput style={{ flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 9, color: COLORS.text, fontSize: 14 }} placeholder="Add a comment…" placeholderTextColor={COLORS.textMuted} value={text} onChangeText={setText} />
                  <TouchableOpacity onPress={postComment} disabled={!text.trim() || posting}>
                    <Ionicons name="send" size={22} color={text.trim() && !posting ? COLORS.primary : COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function VoteSheet({ entry, onClose, onVoted }: { entry: FeedEntry | null; onClose: () => void; onVoted: (id: string, v: number) => void }) {
  const { theme } = useTheme();
  const { COLORS, RADIUS, SPACING } = theme;
  const [submitting, setSubmitting] = useState(false);

  const submit = async (n: number) => {
    if (!entry || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetchApi(`/challenges/entries/${entry.id}/vote`, { method: 'POST', body: JSON.stringify({ value: n }) });
      if (res.ok) { onVoted(entry.id, n); onClose(); }
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={!!entry} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      <View style={{ backgroundColor: COLORS.surfaceElevated, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, paddingBottom: 36, borderWidth: 1, borderBottomWidth: 0, borderColor: COLORS.glassBorder }}>
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, marginBottom: 14 }} />
          <Text style={{ color: COLORS.text, fontWeight: '700', fontSize: 15 }}>Rate this entry</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 4 }}>Avg: {entry?.voteAverage ? entry.voteAverage.toFixed(1) : '—'}/10 · {entry?.voteCount ?? 0} votes</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
            const sel = entry?.myVote === n;
            return (
              <TouchableOpacity key={n} onPress={() => submit(n)} disabled={submitting || !!entry?.myVote} style={{ width: 52, height: 52, borderRadius: RADIUS.md, backgroundColor: sel ? COLORS.gold : COLORS.glass, borderWidth: 1, borderColor: sel ? COLORS.gold : COLORS.glassBorder, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: sel ? '#1A1A1A' : COLORS.text, fontSize: 18, fontWeight: '700' }}>{n}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {!!entry?.myVote && <Text style={{ color: COLORS.textMuted, textAlign: 'center', marginTop: 16, fontSize: 13 }}>You rated this {entry.myVote}/10</Text>}
      </View>
    </Modal>
  );
}

export default function ChallengesFeedScreen({ navigation }: any) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { COLORS, RADIUS, SPACING } = theme;

  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [activeScope, setActiveScope] = useState('ALL');
  const [commentEntry, setCommentEntry] = useState<FeedEntry | null>(null);
  const [voteEntry, setVoteEntry] = useState<FeedEntry | null>(null);
  const PAGE = 12;

  const buildUrl = (cur?: string) => {
    const p = new URLSearchParams({ take: String(PAGE) });
    if (cur) p.set('cursor', cur);
    if (debouncedSearch) p.set('search', debouncedSearch);
    if (activeCategory !== 'ALL') p.set('category', activeCategory);
    if (activeScope !== 'ALL') p.set('scope', activeScope);
    return `/challenges/entries/feed?${p.toString()}`;
  };

  const load = useCallback(async (replace = false) => {
    if (!replace && (!hasMore || loadingMore)) return;
    replace ? setLoading(true) : setLoadingMore(true);
    try {
      const res = await fetchApi(buildUrl(replace ? undefined : cursor));
      if (!res.ok) return;
      const data: FeedEntry[] = await res.json();
      if (data.length < PAGE) setHasMore(false);
      if (data.length > 0) setCursor(data[data.length - 1].id);
      setEntries((prev) => (replace ? data : [...prev, ...data]));
    } catch {
      // silent
    } finally {
      replace ? setLoading(false) : setLoadingMore(false);
    }
  }, [cursor, hasMore, loadingMore, debouncedSearch, activeCategory, activeScope]); // eslint-disable-line

  useFocusEffect(useCallback(() => {
    setHasMore(true);
    setCursor(undefined);
    load(true);
  }, [debouncedSearch, activeCategory, activeScope])); // eslint-disable-line

  const onSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(val), 400);
  };

  const handleLike = async (entry: FeedEntry) => {
    setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, isLikedByMe: !e.isLikedByMe, likeCount: e.likeCount + (e.isLikedByMe ? -1 : 1) } : e));
    try {
      await fetchApi(`/challenges/entries/${entry.id}/like`, { method: 'POST' });
    } catch {
      setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, isLikedByMe: entry.isLikedByMe, likeCount: entry.likeCount } : e));
    }
  };

  const handleVoted = (entryId: string, value: number) =>
    setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, myVote: value } : e));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <View style={{ paddingHorizontal: SPACING.lg, paddingTop: 8, paddingBottom: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={{ flex: 1, color: COLORS.text, fontSize: 19, fontWeight: '800' }}>Challenge Feed</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ChallengesLeaderboard')} style={{ padding: 4 }}>
            <Ionicons name="trophy" size={22} color={COLORS.gold} />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, gap: 8, marginBottom: 10 }}>
          <Ionicons name="search-outline" size={17} color={COLORS.textMuted} />
          <TextInput style={{ flex: 1, color: COLORS.text, fontSize: 14, paddingVertical: 9 }} placeholder="Search challenges, users…" placeholderTextColor={COLORS.textMuted} value={search} onChangeText={onSearchChange} returnKeyType="search" />
          {!!search && <TouchableOpacity onPress={() => onSearchChange('')}><Ionicons name="close-circle" size={17} color={COLORS.textMuted} /></TouchableOpacity>}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 6 }}>
          {SCOPES.map((s) => (
            <TouchableOpacity key={s} onPress={() => setActiveScope(s)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.pill, backgroundColor: activeScope === s ? COLORS.primary : COLORS.surface, borderWidth: 1, borderColor: activeScope === s ? COLORS.primary : COLORS.border }}>
              <Ionicons name={(SCOPE_ICON[s] ?? 'earth') as any} size={12} color={activeScope === s ? '#fff' : COLORS.textMuted} />
              <Text style={{ color: activeScope === s ? '#fff' : COLORS.textMuted, fontSize: 12, fontWeight: '700' }}>{s === 'ALL' ? 'All Areas' : s.charAt(0) + s.slice(1).toLowerCase()}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity key={cat} onPress={() => setActiveCategory(cat)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.pill, backgroundColor: activeCategory === cat ? COLORS.primary : COLORS.surface, borderWidth: 1, borderColor: activeCategory === cat ? COLORS.primary : COLORS.border }}>
              {cat !== 'ALL' && <Ionicons name={(CATEGORY_ICON[cat] ?? 'star') as any} size={12} color={activeCategory === cat ? '#fff' : COLORS.textMuted} />}
              <Text style={{ color: activeCategory === cat ? '#fff' : COLORS.textMuted, fontSize: 12, fontWeight: '700' }}>{cat === 'ALL' ? 'All' : cat.charAt(0) + cat.slice(1).toLowerCase()}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : entries.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 60, gap: 10 }}>
          <Ionicons name="videocam-outline" size={52} color={COLORS.textMuted} />
          <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700' }}>{search ? 'No results found' : 'No entries yet'}</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 32 }}>{search ? 'Try a different search or filter' : 'Be the first to submit a challenge entry'}</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
          onEndReached={() => load(false)}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => (
            <EntryCard
              entry={item}
              navigation={navigation}
              onLike={handleLike}
              onComment={(e) => setCommentEntry(e)}
              onVote={(e) => { if (!e.myVote) setVoteEntry(e); }}
            />
          )}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} /> : null}
        />
      )}

      <CommentSheet entry={commentEntry} onClose={() => setCommentEntry(null)} currentUserId={user?.userId} />
      <VoteSheet entry={voteEntry} onClose={() => setVoteEntry(null)} onVoted={handleVoted} />
    </SafeAreaView>
  );
}
