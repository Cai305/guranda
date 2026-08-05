import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, Image, ActivityIndicator, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';

interface Gif {
  id: string;
  url: string;
  previewUrl: string;
}

interface Props {
  onSelect: (gifUrl: string) => void;
}

// Proxied through GET /gifs/search — the Giphy key stays server-side. Sends
// trending GIFs on open (empty query), same as tapping the GIF button in
// Telegram/WhatsApp before typing anything.
export default function GifPicker({ onSelect }: Props) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const styles = useThemedStyles(({ COLORS, RADIUS }) => ({
    panel: {
      height: 260,
      backgroundColor: COLORS.surfaceElevated || COLORS.surface,
      borderTopWidth: 1,
      borderColor: COLORS.border,
    },
    searchRow: {
      flexDirection: 'row', alignItems: 'center',
      margin: 10, marginBottom: 4,
      backgroundColor: COLORS.surface, borderRadius: 999,
      paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border,
    },
    searchInput: { flex: 1, color: COLORS.text, paddingVertical: 8, fontSize: 14 },
    cell: { flex: 1 / 3, aspectRatio: 1, padding: 3 },
    thumb: { flex: 1, borderRadius: RADIUS.sm || 8, backgroundColor: COLORS.surface },
    errorText: { color: COLORS.textMuted, textAlign: 'center', marginTop: 20, paddingHorizontal: 20, fontSize: 13 },
  }));

  const search = async (q: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi(`/gifs/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not load GIFs');
      setGifs(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
      setGifs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    search('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChangeQuery = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(text), 400);
  };

  return (
    <View style={styles.panel}>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search GIFs..."
          placeholderTextColor={COLORS.textMuted}
          value={query}
          onChangeText={onChangeQuery}
          autoCapitalize="none"
        />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={gifs}
          keyExtractor={g => g.id}
          numColumns={3}
          contentContainerStyle={{ padding: 6 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.cell} onPress={() => onSelect(item.url)} activeOpacity={0.7}>
              <Image source={{ uri: item.previewUrl }} style={styles.thumb} resizeMode="cover" />
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.errorText}>No GIFs found.</Text>}
        />
      )}
    </View>
  );
}
