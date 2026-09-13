import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { PickedSong } from './SongPickerScreen';
import { PerformanceMode } from './PerformanceRecordScreen';

const MODES: { mode: PerformanceMode; icon: keyof typeof Ionicons.glyphMap; color: string; title: string; hint: string }[] = [
  { mode: 'SONG_SYNC', icon: 'musical-note', color: '#8B5CF6', title: 'Song Sync', hint: 'The song plays while you perform — your take is always paired with the real track, perfectly in sync.' },
  { mode: 'KARAOKE', icon: 'mic', color: '#22D3EE', title: 'Karaoke', hint: 'Sing for real — your own voice is captured and kept, over the song. Headphones recommended.' },
  { mode: 'ADD_AFTER', icon: 'timer-outline', color: '#F59E0B', title: 'Add Song After', hint: 'Record silently first, then choose exactly where the song kicks in.' },
];

export default function CreateLipSyncScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const [song, setSong] = useState<PickedSong | null>(null);

  useEffect(() => {
    if (route?.params?.pickedSong) {
      setSong(route.params.pickedSong);
      navigation.setParams({ pickedSong: undefined });
    }
  }, [route?.params?.pickedSong]);

  const pickSong = () => navigation.navigate('SongPicker', { returnScreen: 'CreateLipSync', returnParamKey: 'pickedSong' });
  const chooseMode = (mode: PerformanceMode) => {
    if (!song) return;
    navigation.navigate('PerformanceRecord', { song, mode });
  };

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
    body: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
    songCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: 16 },
    songIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    songTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
    songSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, marginTop: SPACING.xl, marginBottom: 10 },
    modeCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: RADIUS.lg, padding: 16, marginBottom: 10, borderWidth: 1 },
    modeIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    modeTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
    modeHint: { fontSize: 12, color: COLORS.textMuted, marginTop: 3, lineHeight: 16 },
    draftsLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: SPACING.xl, padding: 12 },
    draftsLinkText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sync</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <TouchableOpacity style={styles.songCard} onPress={pickSong}>
          <View style={styles.songIcon}>
            <Ionicons name={song ? 'musical-notes' : 'add'} size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.songTitle}>{song ? song.title : 'Pick a song'}</Text>
            <Text style={styles.songSub}>{song ? song.artistName : 'Choose from the library, your uploads, or upload a new one'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>HOW DO YOU WANT TO PERFORM?</Text>
        {MODES.map((m) => (
          <TouchableOpacity
            key={m.mode}
            style={[styles.modeCard, { backgroundColor: song ? COLORS.surface : COLORS.background, borderColor: song ? COLORS.border : COLORS.border, opacity: song ? 1 : 0.4 }]}
            onPress={() => chooseMode(m.mode)}
            disabled={!song}
          >
            <View style={[styles.modeIcon, { backgroundColor: `${m.color}22` }]}>
              <Ionicons name={m.icon} size={22} color={m.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modeTitle}>{m.title}</Text>
              <Text style={styles.modeHint}>{m.hint}</Text>
            </View>
          </TouchableOpacity>
        ))}
        {!song ? <Text style={{ color: COLORS.textMuted, fontSize: 12, textAlign: 'center', marginTop: 4 }}>Pick a song first to unlock these.</Text> : null}

        <TouchableOpacity style={styles.draftsLink} onPress={() => navigation.navigate('PerformanceDrafts')}>
          <Ionicons name="albums-outline" size={16} color={COLORS.primary} />
          <Text style={styles.draftsLinkText}>My Drafts</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
