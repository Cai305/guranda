import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ScrollView, TextInput, Modal, ActivityIndicator,
  Image, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import { StoryDto } from '@mxit2/types';
import { useAuth } from '../context/AuthContext';
import GiftButton from './gifts/GiftButton';
import ProductMiniCard, { ProductCardData } from './cards/ProductMiniCard';
import { useShoppingCart } from '../context/ShoppingCartContext';
import { formatCurrency } from '../utils/format';

const CCR_RATE = 0.58;
const STORY_RING_COLORS: [string, string][] = [
  ['#8B5CF6', '#EC4899'],
  ['#F97316', '#FBBF24'],
  ['#22D3EE', '#10B981'],
  ['#EF4444', '#8B5CF6'],
  ['#6366F1', '#22D3EE'],
  ['#EC4899', '#F97316'],
  ['#10B981', '#6366F1'],
  ['#FBBF24', '#EF4444'],
];

function timeAgo(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const s = ms / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function dicebearUrl(seed: string) {
  return `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(seed)}`;
}

interface Props {
  navigation: any;
  showStoriesAddButton?: boolean;
}

export default function TrendingStoriesFeed({ navigation, showStoriesAddButton = true }: Props) {
  const { theme } = useTheme();
  const { COLORS, GRADIENTS } = theme;
  const { user } = useAuth();
  const myUserId = (user as any)?.userId;
  const [stories, setStories] = useState<StoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [trending, setTrending] = useState<{ label: string; count: number }[]>([]);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const [commentTarget, setCommentTarget] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [rankTarget, setRankTarget] = useState<string | null>(null);

  // Product sheet for shoppable stories
  const [productSheetItem, setProductSheetItem] = useState<ProductCardData | null>(null);
  const { addItem } = useShoppingCart();

  const loadTrending = useCallback(() => {
    fetchApi('/stories/trending-labels')
      .then(r => r.json())
      .then(d => setTrending(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const loadStories = useCallback(async (label: string | null) => {
    setLoading(true);
    try {
      const qs = label ? `?label=${encodeURIComponent(label)}` : '';
      const res = await fetchApi(`/stories/labeled${qs}`);
      if (res.ok) setStories(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => {
    loadTrending();
    loadStories(activeLabel);
  }, [activeLabel, loadTrending, loadStories]));

  const hasLiked = (s: StoryDto) => !!s.likes?.some(l => l.userId === myUserId);
  const hasCommented = (s: StoryDto) => !!s.comments?.some(c => c.userId === myUserId);
  const myRankOf = (s: StoryDto) => s.ranks?.find(r => r.userId === myUserId)?.value ?? null;
  const avgRankOf = (s: StoryDto) => (s.ranks?.length ? s.ranks.reduce((sum, r) => sum + r.value, 0) / s.ranks.length : 0);

  const patchStory = (id: string, patch: Partial<StoryDto>) => {
    setStories(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
  };

  const reportError = async (res: Response, fallback: string) => {
    const err = await res.json().catch(() => ({}));
    Alert.alert('Could not do that', err.message || fallback);
  };

  const handleLike = async (story: StoryDto) => {
    if (hasLiked(story) || busy[story.id]) return;
    setBusy(prev => ({ ...prev, [story.id]: true }));
    try {
      const res = await fetchApi(`/stories/${story.id}/like`, { method: 'POST' });
      if (res.ok) {
        patchStory(story.id, { likes: [...(story.likes ?? []), { id: 'tmp', storyId: story.id, userId: myUserId, createdAt: new Date() }] });
      } else {
        await reportError(res, 'Something went wrong.');
      }
    } catch {
      Alert.alert('Error', 'Network error.');
    }
    setBusy(prev => ({ ...prev, [story.id]: false }));
  };

  const openComment = (story: StoryDto) => {
    if (hasCommented(story)) return;
    setCommentTarget(story.id);
    setCommentText('');
  };

  const submitComment = async () => {
    if (!commentText.trim() || !commentTarget) return;
    const targetId = commentTarget;
    const story = stories.find(s => s.id === targetId);
    setCommentTarget(null);
    setBusy(prev => ({ ...prev, [targetId]: true }));
    try {
      const res = await fetchApi(`/stories/${targetId}/comment`, {
        method: 'POST',
        body: JSON.stringify({ text: commentText.trim() }),
      });
      if (res.ok && story) {
        patchStory(targetId, {
          comments: [...(story.comments ?? []), { id: 'tmp', storyId: targetId, userId: myUserId, text: commentText.trim(), createdAt: new Date() }],
        });
      } else if (!res.ok) {
        await reportError(res, 'Something went wrong.');
      }
    } catch {
      Alert.alert('Error', 'Network error.');
    }
    setCommentText('');
    setBusy(prev => ({ ...prev, [targetId]: false }));
  };

  const openRank = (story: StoryDto) => {
    if (myRankOf(story) !== null) return;
    setRankTarget(story.id);
  };

  const submitRank = async (value: number) => {
    if (!rankTarget) return;
    const targetId = rankTarget;
    const story = stories.find(s => s.id === targetId);
    setRankTarget(null);
    setBusy(prev => ({ ...prev, [targetId]: true }));
    try {
      const res = await fetchApi(`/stories/${targetId}/rank`, {
        method: 'POST',
        body: JSON.stringify({ value }),
      });
      if (res.ok && story) {
        patchStory(targetId, {
          ranks: [...(story.ranks ?? []), { id: 'tmp', storyId: targetId, userId: myUserId, value, createdAt: new Date() }],
        });
      } else if (!res.ok) {
        await reportError(res, 'Something went wrong.');
      }
    } catch {
      Alert.alert('Error', 'Network error.');
    }
    setBusy(prev => ({ ...prev, [targetId]: false }));
  };


  const storyAuthors = React.useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{ id: string; name: string; avatarUrl: string }> = [];
    for (const s of stories) {
      if (!seen.has(s.userId)) {
        seen.add(s.userId);
        const author = s.author as any;
        result.push({
          id: s.userId,
          name: author?.displayName || author?.username || 'User',
          avatarUrl: author?.avatarUrl || dicebearUrl(author?.username || s.userId),
        });
        if (result.length >= 8) break;
      }
    }
    return result;
  }, [stories]);

  const s = useThemedStyles(({ COLORS, GRADIENTS, RADIUS, SPACING }) => ({
    storiesWrap: { backgroundColor: COLORS.background },
    storiesScroll: { paddingHorizontal: SPACING.lg, paddingVertical: 14, gap: 14 },
    storiesDivider: { height: 1, backgroundColor: COLORS.glassBorder },
    storyItem: { alignItems: 'center', width: 68 },
    storyRing: { width: 64, height: 64, borderRadius: 32, padding: 2.5, justifyContent: 'center', alignItems: 'center' },
    storyRingPlain: {
      width: 64, height: 64, borderRadius: 32,
      borderWidth: 2, borderColor: COLORS.glassBorder,
      justifyContent: 'center', alignItems: 'center',
      backgroundColor: COLORS.surface, position: 'relative',
    },
    storyImg: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.surface },
    storyAddBadge: {
      position: 'absolute', bottom: 0, right: 0,
      width: 20, height: 20, borderRadius: 10,
      backgroundColor: COLORS.primary,
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 2, borderColor: COLORS.background,
    },
    storyName: { fontSize: 11, color: COLORS.textMuted, marginTop: 5, textAlign: 'center' },

    chipsRow: { gap: 8, paddingHorizontal: SPACING.lg, paddingVertical: 10 },
    chip: {
      paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.pill,
      backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    },
    chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '700' },
    chipTextActive: { color: '#fff' },

    post: { backgroundColor: COLORS.background, paddingBottom: 4 },
    postHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    postAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface },
    postAuthorName: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    postMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 1 },
    postImage: { width: '100%', aspectRatio: 4 / 5, backgroundColor: COLORS.surface },

    actionBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingTop: 10, paddingBottom: 4,
    },
    actionLeft: { flexDirection: 'row', gap: 20, alignItems: 'center' },
    action: { alignItems: 'center', gap: 3, minWidth: 48 },
    actionLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
    giftBtn: { backgroundColor: 'transparent', borderWidth: 0, width: 30, height: 30 },
    actionLabelLiked: { color: '#EF4444' },
    actionLabelDone: { color: COLORS.primary },
    actionLabelRanked: { color: COLORS.gold },

    statsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SPACING.lg, paddingVertical: 4 },
    statsText: { color: COLORS.textMuted, fontSize: 13 },
    statsDot: { color: COLORS.textMuted, fontSize: 13 },

    caption: { paddingHorizontal: SPACING.lg, paddingBottom: 4, color: COLORS.text, fontSize: 14, lineHeight: 20 },
    captionBold: { fontWeight: '700' },

    // ── Shoppable product squares ──────────────────────────────
    productSquaresSection: { paddingTop: 8, paddingBottom: 8 },
    productSquaresHeader: { paddingHorizontal: SPACING.lg, marginBottom: 10 },
    productSquaresHeaderPill: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      alignSelf: 'flex-start', borderRadius: RADIUS.pill,
      paddingHorizontal: 10, paddingVertical: 5,
    },
    productSquaresHeaderText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
    productSquaresRow: { paddingHorizontal: SPACING.lg, gap: 12 },
    productSquare: { alignItems: 'center', width: 72 },
    productSquareSold: { opacity: 0.5 },
    productSquareRing: { width: 72, height: 72, borderRadius: 20, padding: 2.5 },
    productSquareInner: {
      flex: 1, borderRadius: 18, overflow: 'hidden',
      backgroundColor: COLORS.surface,
      justifyContent: 'center', alignItems: 'center',
    },
    productSquareImg: {
      width: '100%', height: '100%', borderRadius: 17,
      justifyContent: 'center', alignItems: 'center',
    },
    productSquarePill: {
      marginTop: 6, backgroundColor: COLORS.primary,
      borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
      maxWidth: 72,
    },
    productSquarePillSold: { backgroundColor: COLORS.border },
    productSquarePillText: { color: '#fff', fontSize: 10, fontWeight: '800', textAlign: 'center' },
    productSquareName: { color: COLORS.textMuted, fontSize: 10, marginTop: 3, textAlign: 'center', maxWidth: 72 },
    productSquareBadge: {
      position: 'absolute', top: 0, right: 0,
      width: 18, height: 18, borderRadius: 9,
      backgroundColor: COLORS.secondary,
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 1.5, borderColor: COLORS.background,
    },

    ccrNote: { paddingHorizontal: SPACING.lg, paddingBottom: 10, fontSize: 11, color: COLORS.textMuted, opacity: 0.7 },

    // ── Product detail sheet ────────────────────────────────────
    productSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    productSheetContainer: {
      backgroundColor: COLORS.surfaceElevated,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: SPACING.lg, paddingBottom: 36,
      alignItems: 'center', gap: 14,
      borderWidth: 1, borderBottomWidth: 0, borderColor: COLORS.glassBorder,
    },
    productSheetTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800', alignSelf: 'flex-start' },
    productSheetDismiss: {
      width: '100%', paddingVertical: 13,
      borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.pill,
      alignItems: 'center', marginTop: 4,
    },
    productSheetDismissText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 14 },

    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, gap: 10 },
    emptyTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
    emptySub: { color: COLORS.textMuted, fontSize: 14 },
    emptyBtn: { marginTop: 10, backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: RADIUS.pill },
    emptyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
      backgroundColor: COLORS.surfaceElevated,
      borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
      padding: SPACING.lg, paddingBottom: 32,
      borderWidth: 1, borderBottomWidth: 0, borderColor: COLORS.glassBorder,
    },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.glassBorder, alignSelf: 'center', marginBottom: 16 },
    sheetTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
    sheetCost: { color: COLORS.gold, fontSize: 12, marginBottom: 14 },
    commentInput: {
      backgroundColor: COLORS.surface, color: COLORS.text,
      borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
      padding: 12, minHeight: 90, fontSize: 15, textAlignVertical: 'top', marginBottom: 14,
    },
    sheetBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, paddingVertical: 13, alignItems: 'center' },
    sheetBtnDisabled: { opacity: 0.4 },
    sheetBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

    rankOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
    rankSheet: { backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.xl, padding: SPACING.lg, width: '100%', borderWidth: 1, borderColor: COLORS.glassBorder },
    rankGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16, justifyContent: 'center' },
    rankBtn: { width: 52, height: 52, borderRadius: RADIUS.md, backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder, justifyContent: 'center', alignItems: 'center' },
    rankBtnText: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
    cancelText: { color: COLORS.textMuted, fontSize: 14 },
  }));

  const renderStories = () => (
    <View style={s.storiesWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.storiesScroll}>
        {showStoriesAddButton && (
          <TouchableOpacity style={s.storyItem} onPress={() => navigation.navigate('CreateStory')} activeOpacity={0.8}>
            <View style={s.storyRingPlain}>
              <Image source={{ uri: dicebearUrl(user?.username || 'me') }} style={s.storyImg} />
              <View style={s.storyAddBadge}>
                <Ionicons name="add" size={11} color="#FFF" />
              </View>
            </View>
            <Text style={s.storyName} numberOfLines={1}>Your Story</Text>
          </TouchableOpacity>
        )}
        {storyAuthors.map((a, i) => (
          <View key={a.id} style={s.storyItem}>
            <LinearGradient colors={STORY_RING_COLORS[i % STORY_RING_COLORS.length]} style={s.storyRing}>
              <Image source={{ uri: a.avatarUrl }} style={s.storyImg} />
            </LinearGradient>
            <Text style={s.storyName} numberOfLines={1}>{a.name.split(' ')[0]}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={s.storiesDivider} />
    </View>
  );

  const renderTrendingChips = () => {
    if (trending.length === 0) return null;
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
        <TouchableOpacity style={[s.chip, activeLabel === null && s.chipActive]} onPress={() => setActiveLabel(null)}>
          <Text style={[s.chipText, activeLabel === null && s.chipTextActive]}>All</Text>
        </TouchableOpacity>
        {trending.map(t => (
          <TouchableOpacity
            key={t.label}
            style={[s.chip, activeLabel === t.label && s.chipActive]}
            onPress={() => setActiveLabel(t.label)}
          >
            <Text style={[s.chipText, activeLabel === t.label && s.chipTextActive]}>#{t.label} · {t.count}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderPost = ({ item: story }: { item: StoryDto }) => {
    const liked = hasLiked(story);
    const commented = hasCommented(story);
    const rank = myRankOf(story);
    const avg = avgRankOf(story);
    const likesCount = story.likes?.length ?? 0;
    const commentsCount = story.comments?.length ?? 0;
    const rankCount = story.ranks?.length ?? 0;
    const authorName = (story.author as any)?.displayName || (story.author as any)?.username || 'User';
    const authorSeed = (story.author as any)?.username || story.userId;
    const authorAvatarUrl = (story.author as any)?.avatarUrl || dicebearUrl(authorSeed);
    const firstName = authorName.split(' ')[0];
    const forSaleItems = (story.items ?? []).filter(i => i.isForSale);
    const giftCount = story.giftCount ?? 0;
    const giftTotal = story.giftTotal ?? 0;
    const isOwnStory = story.userId === myUserId;

    return (
      <View style={s.post}>
        <View style={s.postHeader}>
          <Image source={{ uri: authorAvatarUrl }} style={s.postAvatar} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.postAuthorName}>{authorName}</Text>
            <Text style={s.postMeta}>{timeAgo(story.createdAt)} · #{story.label}</Text>
          </View>
          <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.textMuted} />
        </View>

        {story.mediaUrl ? <Image source={{ uri: story.mediaUrl }} style={s.postImage} resizeMode="cover" /> : null}

        <View style={s.actionBar}>
          <View style={s.actionLeft}>
            <TouchableOpacity style={s.action} onPress={() => handleLike(story)} activeOpacity={liked ? 1 : 0.7} disabled={liked}>
              <Ionicons name={liked ? 'heart' : 'heart-outline'} size={26} color={liked ? '#EF4444' : COLORS.text} />
              <Text style={[s.actionLabel, liked && s.actionLabelLiked]}>{liked ? `${likesCount}` : formatCurrency(CCR_RATE)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.action} onPress={() => openComment(story)} activeOpacity={commented ? 1 : 0.7} disabled={commented}>
              <Ionicons name={commented ? 'chatbubble' : 'chatbubble-outline'} size={24} color={commented ? COLORS.primary : COLORS.text} />
              <Text style={[s.actionLabel, commented && s.actionLabelDone]}>{commented ? `${commentsCount}` : formatCurrency(CCR_RATE)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.action} onPress={() => openRank(story)} activeOpacity={rank !== null ? 1 : 0.7} disabled={rank !== null}>
              <Ionicons name="star" size={24} color={rank !== null ? COLORS.gold : COLORS.text} />
              <Text style={[s.actionLabel, rank !== null && s.actionLabelRanked]}>{rank !== null ? `${rank}/10` : formatCurrency(CCR_RATE)}</Text>
            </TouchableOpacity>

            {!isOwnStory && (
              <GiftButton
                recipientId={story.userId}
                recipientName={authorName}
                context="story"
                contextId={story.id}
                size={30}
                style={s.giftBtn}
              />
            )}
          </View>
          <Ionicons name="bookmark-outline" size={24} color={COLORS.textMuted} />
        </View>

        <View style={s.statsRow}>
          <Text style={s.statsText}>{likesCount} likes</Text>
          <Text style={s.statsDot}>·</Text>
          <Text style={s.statsText}>{commentsCount} comments</Text>
          <Text style={s.statsDot}>·</Text>
          <Text style={s.statsText}>avg {avg.toFixed(1)}/10 ({rankCount})</Text>
          {giftCount > 0 && (
            <>
              <Text style={s.statsDot}>·</Text>
              <Text style={s.statsText}>🎁 {formatCurrency(giftTotal)} ({giftCount})</Text>
            </>
          )}
        </View>

        {story.textContent ? (
          <Text style={s.caption} numberOfLines={3}>
            <Text style={s.captionBold}>{firstName} </Text>
            {story.textContent}
          </Text>
        ) : null}

        {/* ── Shoppable product squares ───────────────────── */}
        {forSaleItems.length > 0 && (
          <View style={s.productSquaresSection}>
            <View style={s.productSquaresHeader}>
              <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.productSquaresHeaderPill}>
                <Ionicons name="bag-handle" size={11} color="#fff" />
                <Text style={s.productSquaresHeaderText}>Shop this post</Text>
              </LinearGradient>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.productSquaresRow}>
              {forSaleItems.map(item => {
                const productData: ProductCardData = {
                  id: item.id || (item as any).productId || Math.random().toString(36).slice(2),
                  name: item.name || 'Product',
                  price: typeof item.price === 'number' ? item.price : parseFloat(String(item.price ?? 0)) || 0,
                  imageUrl: (item as any).imageUrl,
                  storeId: (item as any).storeId || 'story-store',
                  storeName: (item as any).brand || (item as any).storeName || authorName,
                };
                const isSold = !!item.soldAt;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[s.productSquare, isSold && s.productSquareSold]}
                    onPress={() => !isSold && setProductSheetItem(productData)}
                    activeOpacity={isSold ? 1 : 0.85}
                  >
                    {/* Gradient ring */}
                    <LinearGradient
                      colors={isSold ? ['#444', '#333'] : ['#8B5CF6', '#EC4899']}
                      style={s.productSquareRing}
                    >
                      <View style={s.productSquareInner}>
                        {productData.imageUrl ? (
                          <Image source={{ uri: productData.imageUrl }} style={s.productSquareImg} resizeMode="cover" />
                        ) : (
                          <LinearGradient colors={isSold ? ['#333', '#222'] : GRADIENTS.primary} style={s.productSquareImg}>
                            <Ionicons name="bag-handle" size={18} color={isSold ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)'} />
                          </LinearGradient>
                        )}
                      </View>
                    </LinearGradient>
                    {/* Price / Sold pill */}
                    <View style={[s.productSquarePill, isSold && s.productSquarePillSold]}>
                      <Text style={s.productSquarePillText} numberOfLines={1}>
                        {isSold ? 'Sold' : `R ${productData.price.toFixed(0)}`}
                      </Text>
                    </View>
                    {/* Name */}
                    <Text style={s.productSquareName} numberOfLines={1}>{productData.name}</Text>
                    {/* Shop badge */}
                    {!isSold && (
                      <View style={s.productSquareBadge}>
                        <Ionicons name="cart" size={10} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {(!liked || !commented || rank === null) && (
          <Text style={s.ccrNote}>Each interaction costs {formatCurrency(CCR_RATE)} · goes directly to the creator</Text>
        )}
      </View>
    );
  };

  if (loading && stories.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={stories}
        keyExtractor={p => p.id}
        renderItem={renderPost}
        ListHeaderComponent={
          <>
            {renderStories()}
            {renderTrendingChips()}
          </>
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={(
          <View style={s.empty}>
            <Ionicons name="flame-outline" size={56} color={COLORS.textMuted} />
            <Text style={s.emptyTitle}>Nothing trending yet</Text>
            <Text style={s.emptySub}>Be the first to post one today</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('CreateStory')}>
              <Text style={s.emptyBtnText}>Create a Story</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <Modal visible={commentTarget !== null} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={s.modalBg} activeOpacity={1} onPress={() => setCommentTarget(null)} />
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Add a Comment</Text>
            <Text style={s.sheetCost}>
              <Ionicons name="flash" size={12} color={COLORS.gold} /> {formatCurrency(CCR_RATE)} · goes to creator · one comment per post
            </Text>
            <TextInput
              style={s.commentInput}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="What do you think?"
              placeholderTextColor={COLORS.textMuted}
              multiline
              autoFocus
            />
            <TouchableOpacity
              style={[s.sheetBtn, !commentText.trim() && s.sheetBtnDisabled]}
              onPress={submitComment}
              disabled={!commentText.trim()}
            >
              <Text style={s.sheetBtnText}>Post  ·  {formatCurrency(CCR_RATE)}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={rankTarget !== null} animationType="fade" transparent>
        <View style={s.rankOverlay}>
          <View style={s.rankSheet}>
            <Text style={s.sheetTitle}>Rank This Post</Text>
            <Text style={s.sheetCost}>
              <Ionicons name="flash" size={12} color={COLORS.gold} /> {formatCurrency(CCR_RATE)} · goes to creator · one rank per post
            </Text>
            <View style={s.rankGrid}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <TouchableOpacity key={n} style={s.rankBtn} onPress={() => submitRank(n)} activeOpacity={0.75}>
                  <Text style={s.rankBtnText}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => setRankTarget(null)} style={{ marginTop: 14, alignItems: 'center' }}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Product detail sheet ──────────────────────────── */}
      <Modal
        visible={!!productSheetItem}
        transparent
        animationType="slide"
        onRequestClose={() => setProductSheetItem(null)}
      >
        <TouchableOpacity style={s.productSheetOverlay} activeOpacity={1} onPress={() => setProductSheetItem(null)}>
          <View style={s.productSheetContainer} onStartShouldSetResponder={() => true}>
            <View style={s.sheetHandle} />
            <Text style={s.productSheetTitle}>Shop this Product</Text>
            {productSheetItem && (
              <ProductMiniCard
                product={productSheetItem}
                navigation={navigation}
                onBuyNow={(p) => {
                  addItem(
                    { id: p.id, name: p.name, price: p.price, imageUrl: p.imageUrl, category: p.category },
                    p.storeId,
                    p.storeName,
                  );
                  setProductSheetItem(null);
                  navigation.navigate('ShoppingCart');
                }}
              />
            )}
            <TouchableOpacity style={s.productSheetDismiss} onPress={() => setProductSheetItem(null)}>
              <Text style={s.productSheetDismissText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

