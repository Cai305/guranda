import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import { CommunityDto } from '@mxit2/types';

const CATEGORIES = ['All', 'Gaming', 'Music', 'Sports', 'Tech', 'Business', 'Lifestyle', 'Education', 'Other'];

export default function BrowseCommunitiesScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [communities, setCommunities] = useState<CommunityDto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('query', query.trim());
      if (category !== 'All') params.set('category', category);
      const res = await fetchApi(`/communities/browse?${params.toString()}`, { headers: { 'Cache-Control': 'no-cache' } });
      if (res.ok) setCommunities(await res.json());
    } catch {}
    setLoading(false);
  }, [query, category]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const styles = useThemedStyles(({ COLORS }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    backButton: { padding: 4 },
    searchContainer: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: COLORS.surface, marginHorizontal: 15, marginTop: 12, marginBottom: 10,
      paddingHorizontal: 15, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border,
    },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, color: COLORS.text, paddingVertical: 12, fontSize: 16 },
    chipRow: { paddingHorizontal: 15, gap: 8, paddingBottom: 12 },
    chip: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
      backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginRight: 8,
    },
    chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipText: { color: COLORS.textMuted, fontWeight: '600', fontSize: 13 },
    chipTextActive: { color: '#fff' },
    list: { paddingHorizontal: 15, paddingBottom: 20, gap: 10 },
    card: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: COLORS.surface, borderRadius: 16, padding: 14,
      borderWidth: 1, borderColor: COLORS.border,
    },
    icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: `${COLORS.primary}22`, alignItems: 'center', justifyContent: 'center' },
    iconImage: { width: 48, height: 48, borderRadius: 24 },
    name: { color: COLORS.text, fontWeight: '700', fontSize: 15 },
    desc: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    metaText: { color: COLORS.textMuted, fontSize: 11 },
    emptyText: { color: COLORS.textMuted, textAlign: 'center', marginTop: 40 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  }));

  const renderCommunity = ({ item }: { item: CommunityDto }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('Community', { communityId: item.id, communityName: item.name })}
    >
      <View style={styles.icon}>
        {item.iconUrl ? <Image source={{ uri: item.iconUrl }} style={styles.iconImage} /> : <Ionicons name="earth" size={22} color={COLORS.primary} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        {!!item.description && <Text style={styles.desc} numberOfLines={1}>{item.description}</Text>}
        <View style={styles.metaRow}>
          <Ionicons name="people-outline" size={12} color={COLORS.textMuted} />
          <Text style={styles.metaText}>{item._count?.members || 0} members</Text>
          {item.privacy === 'PRIVATE' && <Ionicons name="lock-closed" size={11} color={COLORS.textMuted} style={{ marginLeft: 6 }} />}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Discover Communities</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateCommunity')}>
          <Ionicons name="add-circle" size={26} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search communities..."
          placeholderTextColor={COLORS.textMuted}
          value={query}
          onChangeText={(t) => { setQuery(t); load(); }}
          autoCapitalize="none"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
            <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={communities}
          keyExtractor={(item) => item.id}
          renderItem={renderCommunity}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No communities found.</Text>}
        />
      )}
    </SafeAreaView>
  );
}
