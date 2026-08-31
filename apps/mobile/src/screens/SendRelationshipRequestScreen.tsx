import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';

interface UserResult {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

export default function SendRelationshipRequestScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const { intendedStatus } = route.params ?? { intendedStatus: 'IN_RELATIONSHIP' };
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<UserResult | null>(null);
  const [sending, setSending] = useState(false);
  const searchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const label = intendedStatus === 'MARRIED' ? 'Married' : 'In a Relationship';

  const onChangeQuery = (text: string) => {
    setQuery(text);
    setSelected(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!text.trim()) {
      setResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await fetchApi(`/users/search?q=${encodeURIComponent(text.trim())}`);
        if (res.ok) setResults(await res.json());
      } catch {
        // leave results as-is — the user can keep typing/retry
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const send = async () => {
    if (!selected) return;
    setSending(true);
    try {
      const res = await fetchApi('/relationships/request', {
        method: 'POST',
        body: JSON.stringify({ username: selected.username, intendedStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Failed to send request');
      }
      Alert.alert('Request sent', `We'll let you know if @${selected.username} accepts.`);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSending(false);
    }
  };

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    body: { padding: SPACING.lg, flex: 1 },
    hint: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', marginBottom: SPACING.lg, lineHeight: 18 },
    searchRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md, paddingHorizontal: SPACING.md,
    },
    searchInput: { flex: 1, color: COLORS.text, paddingVertical: 12, fontSize: 15 },
    resultsList: {
      maxHeight: 260, marginTop: SPACING.sm,
      backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
      borderWidth: 1, borderColor: COLORS.glassBorder,
    },
    userRow: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
      padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.glassBorder,
    },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceElevated },
    avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
    userName: { color: COLORS.text, fontWeight: '700', fontSize: 13.5 },
    userHandle: { color: COLORS.textMuted, fontSize: 12 },
    emptyText: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', marginTop: SPACING.lg },
    selectedCard: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
      backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.4)',
      borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.lg,
    },
    sendBtn: {
      backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
      paddingVertical: 14, alignItems: 'center', marginTop: SPACING.xl,
    },
    sendBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  }));

  const renderUser = ({ item }: { item: UserResult }) => (
    <TouchableOpacity style={styles.userRow} activeOpacity={0.8} onPress={() => { setSelected(item); setResults([]); setQuery(item.username); }}>
      {item.avatarUrl ? (
        <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Ionicons name="person" size={18} color={COLORS.textMuted} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.userName}>{item.displayName || item.username}</Text>
        <Text style={styles.userHandle}>@{item.username}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Link a Partner</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.body}>
        <Ionicons name="heart" size={40} color={COLORS.primary} style={{ alignSelf: 'center', marginBottom: 12 }} />
        <Text style={styles.hint}>
          Search for your partner by name or username to link up as "{label}". They'll need to accept before it shows on either of your profiles.
        </Text>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or username"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            value={query}
            onChangeText={onChangeQuery}
          />
          {searching && <ActivityIndicator size="small" color={COLORS.primary} />}
        </View>

        {results.length > 0 && (
          <FlatList
            data={results}
            keyExtractor={(item) => item.userId}
            renderItem={renderUser}
            style={styles.resultsList}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {!searching && query.trim() !== '' && results.length === 0 && !selected && (
          <Text style={styles.emptyText}>No users found.</Text>
        )}

        {selected && (
          <View style={styles.selectedCard}>
            {selected.avatarUrl ? (
              <Image source={{ uri: selected.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={18} color={COLORS.textMuted} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{selected.displayName || selected.username}</Text>
              <Text style={styles.userHandle}>@{selected.username}</Text>
            </View>
            <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
          </View>
        )}

        <TouchableOpacity
          style={[styles.sendBtn, !selected && { opacity: 0.4 }]}
          onPress={send}
          disabled={!selected || sending}
        >
          {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendBtnText}>Send Request</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
