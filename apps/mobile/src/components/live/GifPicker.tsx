import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, Image, TouchableOpacity,
  Modal, ActivityIndicator, StyleSheet, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';

const TENOR_API_KEY = 'LIVDSRZULELA';
const TENOR_BASE = 'https://tenor.googleapis.com/v2';
const NUM_COLS = 2;
const SCREEN_W = Dimensions.get('window').width;

interface TenorGif {
  id: string;
  url: string;       // preview URL (small)
  fullUrl: string;   // full GIF URL to send
}

interface GifPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (gifUrl: string) => void;
}

export default function GifPicker({ visible, onClose, onSelect }: GifPickerProps) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextPos, setNextPos] = useState<string | null>(null);

  const { theme } = useTheme();
  const { COLORS } = theme;
  const GIF_SIZE = (SCREEN_W - theme.SPACING.lg * 2 - theme.SPACING.sm) / NUM_COLS;

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheet: {
      backgroundColor: COLORS.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '75%',
      paddingBottom: 20,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    headerTitle: {
      color: COLORS.text,
      fontSize: 17,
      fontWeight: '700',
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: COLORS.glass,
      justifyContent: 'center',
      alignItems: 'center',
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: SPACING.lg,
      marginVertical: SPACING.sm,
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.pill,
      paddingHorizontal: SPACING.md,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    searchInput: {
      flex: 1,
      color: COLORS.text,
      fontSize: 14,
    },
    loadingWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 200,
    },
    gifCell: {
      width: GIF_SIZE,
      height: GIF_SIZE * 0.75,
      borderRadius: RADIUS.md,
      overflow: 'hidden',
      backgroundColor: COLORS.glass,
    },
    gifImage: {
      width: '100%',
      height: '100%',
    },
    tenorCredit: {
      color: COLORS.textMuted,
      fontSize: 10,
      textAlign: 'center',
      marginTop: 4,
    },
  }));

  const fetchGifs = useCallback(async (searchQuery: string, next?: string) => {
    setLoading(true);
    try {
      const isSearch = searchQuery.trim().length > 0;
      const endpoint = isSearch ? 'search' : 'featured';
      const params = new URLSearchParams({
        key: TENOR_API_KEY,
        limit: '20',
        media_filter: 'gif,tinygif',
        ...(isSearch ? { q: searchQuery } : {}),
        ...(next ? { pos: next } : {}),
      });
      const res = await fetch(`${TENOR_BASE}/${endpoint}?${params}`);
      const data = await res.json();
      const parsed: TenorGif[] = (data.results || []).map((r: any) => ({
        id: r.id,
        url: r.media_formats?.tinygif?.url || r.media_formats?.gif?.url || '',
        fullUrl: r.media_formats?.gif?.url || r.media_formats?.tinygif?.url || '',
      }));
      if (next) {
        setGifs(prev => [...prev, ...parsed]);
      } else {
        setGifs(parsed);
      }
      setNextPos(data.next || null);
    } catch {
      // Fail silently, keep existing results
    } finally {
      setLoading(false);
    }
  }, []);

  // Load featured GIFs when opened
  useEffect(() => {
    if (visible) {
      setQuery('');
      fetchGifs('');
    }
  }, [visible]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchGifs(query);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const loadMore = () => {
    if (nextPos && !loading) {
      fetchGifs(query, nextPos);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>GIFs</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchRow}>
            <Ionicons name="search" size={16} color={COLORS.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search GIFs..."
              placeholderTextColor={COLORS.textMuted}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* GIF Grid */}
          {loading && gifs.length === 0 ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <FlatList
              data={gifs}
              keyExtractor={item => item.id}
              numColumns={NUM_COLS}
              contentContainerStyle={{ padding: SPACING.sm, gap: SPACING.sm }}
              columnWrapperStyle={{ gap: SPACING.sm }}
              onEndReached={loadMore}
              onEndReachedThreshold={0.4}
              ListFooterComponent={
                loading ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} /> : null
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.gifCell}
                  onPress={() => {
                    onSelect(item.fullUrl);
                    onClose();
                  }}
                  activeOpacity={0.75}
                >
                  <Image
                    source={{ uri: item.url }}
                    style={styles.gifImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}
            />
          )}

          <Text style={styles.tenorCredit}>Powered by Tenor</Text>
        </View>
      </View>
    </Modal>
  );
}
