import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Modal, Share, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import VideoCard, { VideoMeta } from '../../components/VideoCard';
import VideoCardSkeleton from '../../components/VideoCardSkeleton';

const CATEGORY_CHIPS = ['All', 'Gaming', 'Music', 'Education', 'Cooking', 'Sports', 'Comedy', 'Technology', 'Fashion', 'Travel', 'Fitness', 'Art', 'Science', 'News', 'DIY', 'Finance'];

const FEED_PAGE_SIZE = 20;
// Placeholder rows rendered while the 'feed' tab's first page is in flight —
// count only, content comes from VideoCardSkeleton.
const SKELETON_PLACEHOLDERS = Array.from({ length: 5 });

export default function DiscoverScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const insets = useSafeAreaInsets();
  const [videos, setVideos] = useState<VideoMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [tab, setTab] = useState<'feed' | 'trending'>('feed');
  const [chip, setChip] = useState('All');
  // Next-page cursor for the 'feed' tab's real pagination (GET /videos/feed).
  // A ref, not state, so appending pages doesn't re-render on its own.
  const feedCursorRef = useRef<string | null>(null);
  // Skips the chip-change effect's fetch on mount — the [tab] effect already
  // does the initial load, so without this guard mount would double-fetch.
  const chipMounted = useRef(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VideoMeta[]>([]);
  const [menuVideo, setMenuVideo] = useState<VideoMeta | null>(null);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [targetVideo, setTargetVideo] = useState<VideoMeta | null>(null);
  const searchTimeout = useRef<any>(null);

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 10, gap: 8 },
    back: { padding: 2, marginRight: 4 },
    logo: { flex: 1, ...TYPOGRAPHY.h2, fontSize: 20 },
    headerActions: { flexDirection: 'row', gap: 2 },
    iconBtn: { padding: 6 },
    searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, gap: 8, borderWidth: 1, borderColor: COLORS.border },
    searchInput: { flex: 1, color: COLORS.text, fontSize: 14 },
    tabRow: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: 0, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    tabBtn: { paddingHorizontal: 14, paddingVertical: 10 },
    tabBtnActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
    tabText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
    tabTextActive: { color: COLORS.primary },
    chipsScroll: { maxHeight: 44, flexGrow: 0 },
    chipsList: { paddingHorizontal: SPACING.lg, gap: 8, alignItems: 'center', paddingVertical: 6 },
    chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
    chipTextActive: { color: '#fff' },
    separator: { height: 1, backgroundColor: COLORS.border, marginVertical: 2 },
    empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
    emptyTitle: { ...TYPOGRAPHY.h3, color: COLORS.textMuted },
    emptyHint: { color: COLORS.textMuted, fontSize: 13 },
    // modal
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: { backgroundColor: COLORS.surfaceElevated, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: SPACING.lg, paddingBottom: 36, gap: 4 },
    sheetTitle: { ...TYPOGRAPHY.h3, marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
    sheetLabel: { ...TYPOGRAPHY.body1, fontSize: 15 },
    sheetHint: { color: COLORS.textMuted, fontSize: 13, paddingVertical: 8 },
    // bottom set dynamically via insets in JSX — see ExploreScreen.tsx's
    // fab style comment for why a static value here renders under the tab bar.
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: COLORS.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 28,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    fabText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  }));

  // /videos/feed is real cursor pagination — { videos, nextCursor } — with an
  // optional server-side `category` filter (see loadFeed below for why chip
  // filtering must go through this instead of filtering the fetched list).
  const fetchFeedPage = useCallback(async (reset: boolean) => {
    if (reset) feedCursorRef.current = null;
    try {
      const params = new URLSearchParams();
      params.set('take', String(FEED_PAGE_SIZE));
      if (!reset && feedCursorRef.current) params.set('cursor', feedCursorRef.current);
      if (chip !== 'All') params.set('category', chip);
      const res = await fetchApi(`/videos/feed?${params.toString()}`);
      const data: { videos: VideoMeta[]; nextCursor: string | null } = await res.json();
      const page = Array.isArray(data?.videos) ? data.videos : [];
      setVideos(prev => (reset ? page : [...prev, ...page]));
      feedCursorRef.current = data?.nextCursor ?? null;
      setHasMore(!!data?.nextCursor);
    } catch {
      if (reset) setVideos([]);
      setHasMore(false);
    }
  }, [chip]);

  const loadFeed = useCallback(async (reset: boolean) => {
    if (reset) setLoading(true);
    await fetchFeedPage(reset);
    setLoading(false);
    setRefreshing(false);
  }, [fetchFeedPage]);

  const loadMoreFeed = useCallback(async () => {
    if (loadingMore || !hasMore || tab !== 'feed' || searchOpen || loading) return;
    setLoadingMore(true);
    await fetchFeedPage(false);
    setLoadingMore(false);
  }, [loadingMore, hasMore, tab, searchOpen, loading, fetchFeedPage]);

  // /videos/trending is unchanged — a single-shot fetch, no pagination.
  const loadTrending = useCallback(async () => {
    try {
      const res = await fetchApi('/videos/trending');
      const data = await res.json();
      setVideos(Array.isArray(data) ? data : []);
    } catch { setVideos([]); }
    setLoading(false);
    setRefreshing(false);
  }, []);

  const load = useCallback(() => {
    if (tab === 'trending') loadTrending();
    else loadFeed(true);
  }, [tab, loadTrending, loadFeed]);

  // Refetches on every focus, not just mount — a stack `navigate()` back
  // from VideoUpload (or VideoPlayer) doesn't unmount this screen, so a
  // plain mount-only effect would leave a just-uploaded video invisible
  // until the app fully reloaded.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Category chip changes on the 'feed' tab reset + refetch server-side
  // (via `category`) rather than filtering the already-fetched list — see
  // the `filtered` comment below for why client-side filtering breaks
  // pagination. Trending's chip filtering stays client-side, unchanged.
  useEffect(() => {
    if (!chipMounted.current) { chipMounted.current = true; return; }
    if (tab === 'feed') loadFeed(true);
  }, [chip]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    try {
      const res = await fetchApi(`/videos/search?q=${encodeURIComponent(q)}`);
      const d = await res.json();
      setSearchResults(Array.isArray(d) ? d : []);
    } catch { }
  }, []);

  const onQueryChange = (q: string) => {
    setQuery(q);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => doSearch(q), 400);
  };

  const loadPlaylists = async () => {
    try {
      const res = await fetchApi('/videos/playlists/mine');
      const d = await res.json();
      setPlaylists(Array.isArray(d) ? d : []);
    } catch { }
  };

  // 'feed' videos are already category-filtered server-side (see fetchFeedPage) —
  // filtering them again client-side here would leave `hasMore` reflecting the
  // unfiltered page while the visibly-shorter filtered list hits its end,
  // triggering loadMore fetches whose results just get filtered back out
  // (looks stuck/broken). 'trending' has no category param, so it keeps the
  // original client-side filter.
  const filtered = tab === 'trending'
    ? (chip === 'All' ? videos : videos.filter(v => v.category === chip))
    : videos;
  const displayList = searchOpen && query ? searchResults : filtered;

  const handleMenuPress = (v: VideoMeta) => setMenuVideo(v);

  const saveWatchLater = async (v: VideoMeta) => {
    setMenuVideo(null);
    if (v.savedLater) {
      await fetchApi(`/videos/${v.id}/watch-later`, { method: 'DELETE' });
    } else {
      await fetchApi(`/videos/${v.id}/watch-later`, { method: 'POST' });
    }
    setVideos(prev => prev.map(x => x.id === v.id ? { ...x, savedLater: !x.savedLater } : x));
  };

  const handleAddToPlaylist = async (v: VideoMeta) => {
    setMenuVideo(null);
    setTargetVideo(v);
    await loadPlaylists();
    setShowPlaylistPicker(true);
  };

  const addToPlaylist = async (playlistId: string) => {
    if (!targetVideo) return;
    setShowPlaylistPicker(false);
    await fetchApi(`/videos/playlists/${playlistId}/videos`, { method: 'POST', body: JSON.stringify({ videoId: targetVideo.id }) });
    Alert.alert('Added', 'Video added to playlist');
  };

  const handleShare = async (v: VideoMeta) => {
    setMenuVideo(null);
    try {
      await Share.share({ title: v.title, message: `Watch "${v.title}" on Guranda Discovery` });
    } catch { }
  };

  const openInterests = () => navigation.navigate('InterestPicker', { onSave: () => load() });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        {searchOpen ? (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search videos…"
              placeholderTextColor={COLORS.textMuted}
              value={query}
              onChangeText={onQueryChange}
              autoFocus
            />
            <TouchableOpacity onPress={() => { setSearchOpen(false); setQuery(''); setSearchResults([]); }}>
              <Ionicons name="close" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
              <Ionicons name="arrow-back" size={22} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.logo}>Discovery</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setSearchOpen(true)}>
                <Ionicons name="search" size={22} color={COLORS.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={openInterests}>
                <Ionicons name="options" size={22} color={COLORS.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('VideoUpload')}>
                <Ionicons name="add-circle-outline" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Tab bar: Feed / Trending */}
      {!searchOpen && (
        <View style={styles.tabRow}>
          {(['feed', 'trending'] as const).map(t => (
            <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => { setTab(t); setLoading(true); }}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'feed' ? 'For You' : 'Trending'}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.tabBtn} onPress={() => navigation.navigate('WatchLater')}>
            <Text style={styles.tabText}>Watch Later</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabBtn} onPress={() => navigation.navigate('MyPlaylists')}>
            <Text style={styles.tabText}>Playlists</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Category chips */}
      {!searchOpen && (
        <FlatList
          horizontal
          data={CATEGORY_CHIPS}
          keyExtractor={c => c}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsList}
          style={styles.chipsScroll}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, chip === item && styles.chipActive]}
              onPress={() => setChip(item)}
            >
              <Text style={[styles.chipText, chip === item && styles.chipTextActive]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Videos list */}
      {loading && tab === 'feed' ? (
        // "Loads like YouTube": frame + chrome are already on screen (above),
        // shimmer placeholders show where content will land, then real cards
        // replace them once the first page resolves — never a blank/spinner-only screen.
        <FlatList
          data={SKELETON_PLACEHOLDERS}
          keyExtractor={(_, i) => `skeleton-${i}`}
          renderItem={() => <VideoCardSkeleton />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      ) : loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={displayList}
          keyExtractor={v => v.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
          renderItem={({ item }) => (
            <VideoCard
              video={item}
              onPress={v => navigation.navigate('VideoPlayer', { videoId: v.id })}
              onMenuPress={handleMenuPress}
            />
          )}
          onEndReached={tab === 'feed' ? loadMoreFeed : undefined}
          onEndReachedThreshold={0.6}
          ListFooterComponent={
            tab === 'feed' && loadingMore ? <ActivityIndicator color={COLORS.primary} style={{ paddingVertical: 20 }} /> : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="play-circle-outline" size={64} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>{searchOpen && query ? 'No results' : 'No videos yet'}</Text>
              {!searchOpen && <Text style={styles.emptyHint}>Tap Upload to share your first video</Text>}
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* 3-dot menu bottom sheet */}
      <Modal visible={!!menuVideo} transparent animationType="slide" onRequestClose={() => setMenuVideo(null)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setMenuVideo(null)} />
        <View style={styles.sheet}>
          {menuVideo && (
            <>
              <Text style={styles.sheetTitle} numberOfLines={1}>{menuVideo.title}</Text>
              <TouchableOpacity style={styles.sheetRow} onPress={() => saveWatchLater(menuVideo!)}>
                <Ionicons name={menuVideo.savedLater ? 'bookmark' : 'bookmark-outline'} size={20} color={COLORS.text} />
                <Text style={styles.sheetLabel}>{menuVideo.savedLater ? 'Remove from Watch Later' : 'Save to Watch Later'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetRow} onPress={() => handleAddToPlaylist(menuVideo!)}>
                <Ionicons name="list" size={20} color={COLORS.text} />
                <Text style={styles.sheetLabel}>Save to playlist</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetRow} onPress={() => handleShare(menuVideo!)}>
                <Ionicons name="share-social-outline" size={20} color={COLORS.text} />
                <Text style={styles.sheetLabel}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sheetRow, { marginTop: 4 }]} onPress={() => setMenuVideo(null)}>
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
                <Text style={[styles.sheetLabel, { color: COLORS.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>

      {/* Playlist picker */}
      <Modal visible={showPlaylistPicker} transparent animationType="slide" onRequestClose={() => setShowPlaylistPicker(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowPlaylistPicker(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Add to playlist</Text>
          {playlists.length === 0 && <Text style={styles.sheetHint}>No playlists yet. Create one in the Playlists tab.</Text>}
          {playlists.map(pl => (
            <TouchableOpacity key={pl.id} style={styles.sheetRow} onPress={() => addToPlaylist(pl.id)}>
              <Ionicons name="list" size={20} color={COLORS.primary} />
              <Text style={styles.sheetLabel}>{pl.name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.sheetRow} onPress={() => { setShowPlaylistPicker(false); navigation.navigate('MyPlaylists'); }}>
            <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
            <Text style={[styles.sheetLabel, { color: COLORS.primary }]}>Create new playlist</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Upload FAB */}
      {!searchOpen && (
        <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 76 }]} onPress={() => navigation.navigate('VideoUpload')} activeOpacity={0.85}>
          <Ionicons name="cloud-upload" size={22} color="#fff" />
          <Text style={styles.fabText}>Upload</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}
