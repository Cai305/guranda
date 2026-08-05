import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import io, { Socket } from 'socket.io-client';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { Difficulty } from '../../games/murabaraba/ai';
import { MURABARABA_MODES, MurabarabaMode } from '@mxit2/types';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../utils/api';
import SessionHeaderActions from '../../components/SessionHeaderActions';

const DIFFICULTIES: { key: Difficulty; label: string; blurb: string }[] = [
  { key: 'easy', label: 'Easy', blurb: 'Learns with you' },
  { key: 'medium', label: 'Medium', blurb: 'Thinks ahead' },
  { key: 'hard', label: 'Hard', blurb: 'A ruthless herder' },
];

const ONLINE_MODES = Object.keys(MURABARABA_MODES) as MurabarabaMode[];

const RULES: { icon: string; text: string }[] = [
  { icon: 'grid-outline', text: 'Take turns placing your 12 cows on the 24 points.' },
  { icon: 'remove-outline', text: 'Line up 3 cows on any line to make a MILL — then shoot an enemy cow.' },
  { icon: 'swap-horizontal-outline', text: 'Once placed, cows move along lines to empty neighbouring points.' },
  { icon: 'airplane-outline', text: 'Down to 3 cows? Your cows can fly to any empty point.' },
  { icon: 'shield-outline', text: 'Cows inside a mill are safe — unless every enemy cow is in a mill.' },
  { icon: 'trophy-outline', text: 'Win by shrinking the enemy herd to 2 cows, or trapping them.' },
];

export default function MurabarabaLobbyScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY, GRADIENTS } = theme;
  const { user } = useAuth();
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [onlineMode, setOnlineMode] = useState<MurabarabaMode>('1v1');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const sock = io(`${API_BASE_URL}/murabaraba`);
    setSocket(sock);
    sock.on('match_found', (data: { gameId: string }) => {
      setSearching(false);
      navigation.navigate('MurabarabaGame', { mode: 'online', gameId: data.gameId });
    });
    return () => { sock.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const findOnline = () => {
    if (!socket || !user || searching) return;
    setSearching(true);
    socket.emit('join_queue', {
      mode: onlineMode,
      userId: user.userId,
      displayName: user.displayName || user.username || 'Player',
    });
  };

  const cancelSearch = () => {
    socket?.emit('leave_queue');
    setSearching(false);
  };

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING, TYPOGRAPHY }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: RADIUS.pill,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      justifyContent: 'center', alignItems: 'center',
    },
    hero: {
      marginHorizontal: SPACING.lg,
      borderRadius: RADIUS.lg,
      padding: 22,
      alignItems: 'center',
      borderWidth: 1, borderColor: COLORS.glassBorder,
    },
    heroEmoji: { fontSize: 42 },
    heroTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800', marginTop: 8 },
    heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 19 },
    sectionLabel: {
      ...TYPOGRAPHY.label, fontSize: 11,
      paddingHorizontal: SPACING.lg,
      marginTop: SPACING.xl, marginBottom: SPACING.md,
    },
    diffRow: {
      flexDirection: 'row', gap: 10,
      paddingHorizontal: SPACING.lg,
    },
    diffCard: {
      flex: 1,
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      padding: 12,
      alignItems: 'center',
    },
    diffCardActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(139,92,246,0.15)' },
    diffLabel: { color: COLORS.textMuted, fontWeight: '800', fontSize: 14 },
    diffBlurb: { color: COLORS.textMuted, fontSize: 10, marginTop: 4 },
    playBtn: {
      flexDirection: 'row', gap: 10,
      marginHorizontal: SPACING.lg, marginTop: SPACING.md,
      backgroundColor: COLORS.primary,
      borderRadius: RADIUS.pill,
      paddingVertical: 14,
      justifyContent: 'center', alignItems: 'center',
    },
    playBtnAlt: { backgroundColor: '#0EA5E9', marginTop: 0 },
    playBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
    rules: {
      marginHorizontal: SPACING.lg,
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      padding: 14,
      gap: 12,
    },
    ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    ruleIcon: {
      width: 30, height: 30, borderRadius: 15,
      backgroundColor: 'rgba(139,92,246,0.15)',
      justifyContent: 'center', alignItems: 'center',
    },
    ruleText: { color: COLORS.textMuted, fontSize: 12.5, flex: 1, lineHeight: 18 },
  }));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <SessionHeaderActions
            navigation={navigation}
            session={{
              id: 'murabaraba',
              label: 'Murabaraba',
              icon: 'apps',
              gradient: GRADIENTS.sunset,
              route: { name: 'Main', params: { screen: 'Life', params: { screen: 'MurabarabaLobby' } } },
            }}
          />
          <Text style={TYPOGRAPHY.h2}>Murabaraba</Text>
          <View style={{ width: 40 }} />
        </View>

        <LinearGradient colors={['#3A0E6E', '#200840']} style={styles.hero}>
          <Text style={styles.heroEmoji}>🐄</Text>
          <Text style={styles.heroTitle}>The Game of Cows</Text>
          <Text style={styles.heroSub}>
            South Africa's traditional strategy classic. Place your herd, make
            mills, shoot the enemy's cows.
          </Text>
        </LinearGradient>

        <Text style={styles.sectionLabel}>PLAY VS AI</Text>
        <View style={styles.diffRow}>
          {DIFFICULTIES.map(d => (
            <TouchableOpacity
              key={d.key}
              style={[styles.diffCard, difficulty === d.key && styles.diffCardActive]}
              onPress={() => setDifficulty(d.key)}
            >
              <Text style={[styles.diffLabel, difficulty === d.key && { color: COLORS.text }]}>
                {d.label}
              </Text>
              <Text style={styles.diffBlurb}>{d.blurb}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={styles.playBtn}
          onPress={() => navigation.navigate('MurabarabaGame', { mode: 'ai', difficulty })}
        >
          <Ionicons name="hardware-chip-outline" size={20} color="#FFF" />
          <Text style={styles.playBtnText}>Play vs AI</Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>PLAY ONLINE</Text>
        <View style={styles.diffRow}>
          {ONLINE_MODES.map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.diffCard, onlineMode === m && styles.diffCardActive, searching && { opacity: 0.5 }]}
              onPress={() => !searching && setOnlineMode(m)}
              disabled={searching}
            >
              <Text style={[styles.diffLabel, onlineMode === m && { color: COLORS.text }]}>
                {MURABARABA_MODES[m].label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.playBtn, { backgroundColor: searching ? '#333' : '#0EA5E9' }]}
          onPress={searching ? cancelSearch : findOnline}
        >
          {searching ? (
            <>
              <ActivityIndicator color={COLORS.gold} size="small" />
              <Text style={styles.playBtnText}>Searching for herders… tap to cancel</Text>
            </>
          ) : (
            <>
              <Ionicons name="globe-outline" size={20} color="#FFF" />
              <Text style={styles.playBtnText}>Play Online</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>PLAYER VS PLAYER</Text>
        <TouchableOpacity
          style={[styles.playBtn, styles.playBtnAlt]}
          onPress={() => navigation.navigate('MurabarabaGame', { mode: 'local' })}
          disabled={searching}
        >
          <Ionicons name="people-outline" size={20} color="#FFF" />
          <Text style={styles.playBtnText}>2 Players — Same Device</Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>HOW TO PLAY</Text>
        <View style={styles.rules}>
          {RULES.map((r, i) => (
            <View key={i} style={styles.ruleRow}>
              <View style={styles.ruleIcon}>
                <Ionicons name={r.icon as any} size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.ruleText}>{r.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
