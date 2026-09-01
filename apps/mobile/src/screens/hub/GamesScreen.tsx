import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import ConstructionBadge from '../../components/ConstructionBadge';
import { useStore } from '../../context/StoreContext';

interface GameEntry {
  id: string;
  name: string;
  blurb: string;
  icon: string;
  gradient: [string, string];
  live: boolean;
  route?: string;
  features: string[];
  // Set for games published via Profile > Developer Hub instead of built
  // into the app — routes to ExternalApp with this URL rather than a
  // registered screen name.
  externalUrl?: string;
}

// Every existing game stays playable. Upcoming games are
// visible with full info, but cannot be launched — they open
// the Under Construction experience instead.
export const GAMES: GameEntry[] = [
  {
    id: 'fivecards',
    name: '5 Cards',
    blurb: 'South African 5 Cards — draw, discard, and race to a straight or full house.',
    icon: 'albums',
    gradient: ['#10B981', '#22D3EE'],
    live: true,
    route: 'FiveCardsLobby',
    features: [],
  },
  {
    id: 'cassino',
    name: 'Cassino',
    blurb: 'South African house rules — capture, build, and sweep the table for points.',
    icon: 'grid',
    gradient: ['#F59E0B', '#FBBF24'],
    live: true,
    route: 'CassinoLobby',
    features: [],
  },
  {
    id: 'chess',
    name: 'Chess',
    blurb: 'Real-time multiplayer chess. Challenge anyone in the world.',
    icon: 'extension-puzzle',
    gradient: ['#8B5CF6', '#6366F1'],
    live: true,
    route: 'ChessLobby',
    features: [],
  },
  {
    id: 'trivia',
    name: 'Trivia Arcade',
    blurb: 'Fast-paced quiz rounds. Beat the timer, top the leaderboard.',
    icon: 'help-circle',
    gradient: ['#22D3EE', '#8B5CF6'],
    live: true,
    route: 'Arcade',
    features: [],
  },
  {
    id: 'ludo',
    name: 'Ludo',
    blurb: '1v1, 2v2, 2v2v2, 4v4 or 1v5 — play real opponents or AI bots instantly.',
    icon: 'dice',
    gradient: ['#10B981', '#22D3EE'],
    live: true,
    route: 'LudoLobby',
    features: [],
  },
  {
    id: 'murabaraba',
    name: 'Murabaraba',
    blurb: "South Africa's game of cows. Make mills, shoot cows — vs AI or a friend.",
    icon: 'apps',
    gradient: ['#F472B6', '#FB923C'],
    live: true,
    route: 'MurabarabaLobby',
    features: [],
  },
  {
    id: 'moonbase',
    name: 'MoonBase 2.0',
    blurb: 'The legendary social world returns — rooms, avatars and hangouts.',
    icon: 'planet',
    gradient: ['#1E1B4B', '#312E81'],
    live: true,
    route: 'MoonBase',
    features: [],
  },
  {
    id: 'pool',
    name: '8-Ball Pool',
    blurb: 'Classic 8-ball with MSH wagers — vs AI or a friend on one device.',
    icon: 'ellipse',
    gradient: ['#10B981', '#22D3EE'],
    live: true,
    route: 'PoolLobby',
    features: [],
  },
  {
    id: 'wordbattle',
    name: 'Word Battle',
    blurb: 'Wordle Duel, Boggle or Scrabble — vs AI or a friend, with MSH wagers.',
    icon: 'text',
    gradient: ['#F472B6', '#FB923C'],
    live: true,
    route: 'WordBattleLobby',
    features: [],
  },
  {
    id: 'racing',
    name: 'Turbo Racing',
    blurb: 'Dodge traffic, grab boosts, race a real opponent — upgrades bought from your one wallet.',
    icon: 'speedometer',
    gradient: ['#F87171', '#F472B6'],
    live: true,
    route: 'TurboRacingLobby',
    features: ['Real-time online races', 'Car upgrades', 'MSH rewards'],
  },
];

export default function GamesScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY, SPACING, BRAND } = theme;
  const { installApp, isInstalled, communityApps } = useStore();
  const [modal, setModal] = useState<GameEntry | null>(null);

  // Games published via Profile > Developer Hub — merged alongside the
  // built-in catalog above so an installed community game actually shows
  // up here (previously it was installable from the Store but had no
  // "installed games" list of its own to appear in).
  const communityGames: GameEntry[] = communityApps
    .filter(a => a.isGame)
    .map(a => ({
      id: a.id,
      name: a.name,
      blurb: a.description || 'Community game',
      icon: a.icon,
      gradient: [a.color, a.color],
      live: true,
      features: [],
      externalUrl: a.sourceUrl,
    }));

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, RADIUS, SPACING }) => ({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.pill,
      backgroundColor: COLORS.glass,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sectionLabel: {
      ...TYPOGRAPHY.label,
      fontSize: 11,
      paddingHorizontal: SPACING.lg,
      marginTop: SPACING.md,
      marginBottom: SPACING.md,
    },
    list: {
      paddingHorizontal: SPACING.lg,
      gap: SPACING.md,
    },
    gameCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      borderRadius: RADIUS.lg,
      padding: 16,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
    },
    gameIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.18)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    gameIconLocked: {
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    gameTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    gameName: {
      color: COLORS.text,
      fontSize: 16,
      fontWeight: '700',
    },
    livePill: {
      backgroundColor: 'rgba(52, 211, 153, 0.2)',
      borderWidth: 1,
      borderColor: 'rgba(52, 211, 153, 0.5)',
      borderRadius: RADIUS.pill,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    livePillText: {
      color: COLORS.success,
      fontSize: 10,
      fontWeight: '800',
    },
    gameBlurb: {
      color: 'rgba(255,255,255,0.75)',
      fontSize: 12,
      marginTop: 4,
      lineHeight: 17,
    },
    getPill: {
      backgroundColor: 'rgba(255,255,255,0.22)',
      borderRadius: RADIUS.pill,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    getPillText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '800',
    },
    // Install modal — mirrors the Guranda Store sheet
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: COLORS.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: 28,
      alignItems: 'center',
    },
    sheetIcon: {
      width: 72,
      height: 72,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    sheetTitle: { ...TYPOGRAPHY.h2, marginBottom: 4 },
    sheetDesc: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
    featureList: { alignSelf: 'stretch', gap: 8, marginBottom: 24 },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    featureText: { color: COLORS.text, fontSize: 13 },
    sheetButtons: { flexDirection: 'row', gap: 12, alignSelf: 'stretch' },
    cancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: COLORS.surfaceElevated,
      alignItems: 'center',
    },
    cancelText: { color: COLORS.textMuted, fontWeight: '600', fontSize: 15 },
    installBtn: { flex: 2, borderRadius: 14, overflow: 'hidden' },
    installGradient: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
    },
    installText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  }));

  const mode = route?.params?.mode || 'store';

  const handlePress = (game: GameEntry) => {
    if (!game.live) {
      navigation.navigate('UnderConstruction', {
        name: game.name,
        icon: game.icon,
        tagline: game.blurb,
        description: `${game.name} is being built for the ${BRAND.name} Arcade. You can't play it yet — but when it launches it will connect to your one identity, leaderboards, seasons and rewards.`,
        features: game.features,
      });
    } else if (isInstalled(game.id)) {
      if (game.externalUrl) {
        navigation.navigate('ExternalApp', { sourceUrl: game.externalUrl, name: game.name });
      } else {
        navigation.navigate(game.route!);
      }
    } else {
      setModal(game);
    }
  };

  const handleInstall = () => {
    if (!modal) return;
    installApp(modal.id);
    setModal(null);
  };

  const renderGame = (game: GameEntry) => {
    const installed = game.live && isInstalled(game.id);
    return (
      <TouchableOpacity key={game.id} activeOpacity={0.85} onPress={() => handlePress(game)}>
        <LinearGradient
          colors={game.live ? game.gradient : [COLORS.surfaceElevated, COLORS.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gameCard}
        >
          <View style={[styles.gameIcon, !game.live && styles.gameIconLocked]}>
            <Ionicons name={game.icon as any} size={26} color={game.live ? '#FFF' : game.gradient[0]} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.gameTitleRow}>
              <Text style={styles.gameName}>{game.name}</Text>
              {!game.live ? (
                <ConstructionBadge compact />
              ) : installed ? (
                <View style={styles.livePill}><Text style={styles.livePillText}>INSTALLED</Text></View>
              ) : (
                <View style={styles.getPill}><Text style={styles.getPillText}>GET</Text></View>
              )}
            </View>
            <Text style={[styles.gameBlurb, !game.live && { color: COLORS.textMuted }]} numberOfLines={2}>
              {game.blurb}
            </Text>
          </View>
          <Ionicons
            name={!game.live ? 'information-circle-outline' : installed ? 'play-circle' : 'cloud-download-outline'}
            size={28}
            color={game.live ? '#FFF' : COLORS.textMuted}
          />
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const liveGames = [...GAMES.filter(g => g.live), ...communityGames];
  const upcomingGames = GAMES.filter(g => !g.live);
  const installedGames = [...GAMES, ...communityGames].filter(g => isInstalled(g.id));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={TYPOGRAPHY.h2}>{mode === 'installed-games' ? 'Installed Games' : 'Games'}</Text>
          <View style={{ width: 40 }} />
        </View>

        {mode === 'installed-games' ? (
          <>
            <Text style={styles.sectionLabel}>INSTALLED</Text>
            <View style={styles.list}>
              {installedGames.length === 0 ? (
                <Text style={{ color: COLORS.textMuted, paddingHorizontal: SPACING.lg }}>No games installed.</Text>
              ) : (
                installedGames.map(renderGame)
              )}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.sectionLabel}>PLAY NOW</Text>
            <View style={styles.list}>
              {liveGames.map(renderGame)}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: SPACING.xl }]}>UPCOMING GAMES</Text>
            <View style={styles.list}>
              {upcomingGames.map(renderGame)}
            </View>
          </>
        )}
      </ScrollView>

      {/* Install modal — mirrors the Guranda Store install sheet used for installable modules */}
      <Modal visible={!!modal} transparent animationType="fade" onRequestClose={() => setModal(null)}>
        <TouchableWithoutFeedback onPress={() => setModal(null)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.sheet}>
                {modal && (
                  <>
                    <LinearGradient
                      colors={modal.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.sheetIcon}
                    >
                      <Ionicons name={modal.icon as any} size={32} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.sheetTitle}>{modal.name}</Text>
                    <Text style={styles.sheetDesc}>{modal.blurb}</Text>
                    {modal.features.length > 0 && (
                      <View style={styles.featureList}>
                        {modal.features.slice(0, 4).map(f => (
                          <View key={f} style={styles.featureRow}>
                            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                            <Text style={styles.featureText}>{f}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    <View style={styles.sheetButtons}>
                      <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(null)}>
                        <Text style={styles.cancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.installBtn} onPress={handleInstall}>
                        <LinearGradient
                          colors={modal.gradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.installGradient}
                        >
                          <Ionicons name="cloud-download-outline" size={16} color="#fff" />
                          <Text style={styles.installText}>Install</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}
