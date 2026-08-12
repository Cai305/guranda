import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useEffectiveModules, LifeModule, MINI_APP_IDS } from '../config/modules';
import { AI_ENABLED } from '../config/featureFlags';
import ModuleCard from '../components/ModuleCard';
import SectionHeader from '../components/SectionHeader';
import ConstructionBadge from '../components/ConstructionBadge';
import LiveStreamCard from '../components/LiveStreamCard';
import ResumeSessionBanner from '../components/ResumeSessionBanner';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useStore } from '../context/StoreContext';
import { fetchApi } from '../utils/api';
import { formatCurrency } from '../utils/format';
import { MOCK_STREAMS } from '../data/mockLiveStreams';
import { fetchLiveRooms, RealLiveStream, enterLiveStream } from '../data/liveApi';
import { GAMES } from './hub/GamesScreen';
import { FIXED_COMPANION_IDS } from '../config/fixedCompanions';

export default function HomeScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, GRADIENTS, BRAND, SPACING } = theme;

  // The Home dashboard mirrors the Life tab's 4 top-level doors — Games and
  // Mini Apps deep-link straight to each store's "installed" view for quick
  // access, since everything else now lives one tap deeper behind install.
  const YOUR_LIFE_ITEMS: LifeModule[] = [
    { id: 'live_module', name: 'Live', icon: 'radio', gradient: GRADIENTS.live, status: 'live', tagline: 'Broadcast to the world', description: '', features: [], route: { name: 'Live' } },
    { id: 'discovery_module', name: 'Discovery', icon: 'play-circle', gradient: GRADIENTS.crimson, status: 'live', tagline: 'Videos tailored to you', description: '', features: [], route: { name: 'Discovery' } },
    { id: 'games_installed', name: 'Games', icon: 'game-controller', gradient: GRADIENTS.aurora, status: 'live', tagline: 'Your installed games', description: '', features: [], route: { name: 'Life', params: { screen: 'Games', params: { mode: 'installed-games' } } } },
    { id: 'miniapps_installed', name: 'Mini Apps', icon: 'apps', gradient: GRADIENTS.emerald, status: 'live', tagline: 'Your installed mini apps', description: '', features: [], route: { name: 'Life', params: { screen: 'Hub', params: { mode: 'installed-miniapps' } } } },
  ];

  const EVENTS = [
    { id: 'e1', title: 'Season 1 Championship', when: 'Starts Monday', icon: 'trophy', color: COLORS.gold },
    { id: 'e2', title: 'Community Game Night', when: 'Friday · 19:00', icon: 'game-controller', color: COLORS.secondary },
    { id: 'e3', title: 'Guranda Creator AMA', when: 'Next week', icon: 'mic', color: COLORS.accent },
  ];

  const { user } = useAuth();
  const { onlineUsers } = useSocket();
  const MODULES = useEffectiveModules();
  const [wallet, setWallet] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [realRooms, setRealRooms] = useState<RealLiveStream[]>([]);
  const aiChecked = React.useRef(false);

  // First-run AI onboarding: if this account has no AI companion yet,
  // take the user through setup once.
  React.useEffect(() => {
    if (!AI_ENABLED) return;
    if (aiChecked.current) return;
    aiChecked.current = true;
    fetchApi('/ai/agent')
      .then(res => (res.ok ? res.json() : null))
      .then(agent => {
        if (agent && agent.exists === false) navigation.navigate('AiSetup');
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchLiveRooms().then(setRealRooms);
      fetchApi('/wallets/me')
        .then(res => (res.ok ? res.json() : null))
        .then(data => data && setWallet(data))
        .catch(() => {});
      fetchApi('/chats')
        .then(res => (res.ok ? res.json() : []))
        .then(data => Array.isArray(data) && setChats(data))
        .catch(() => {});
      fetchApi('/communities')
        .then(res => (res.ok ? res.json() : []))
        .then(data => Array.isArray(data) && setCommunities(data))
        .catch(() => {});
    }, [])
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const displayName = user?.displayName || user?.username || 'Pioneer';
  const onlineCount = Object.values(onlineUsers || {}).filter(s => s === 'online').length;

  const recentChats = chats.length > 0 ? chats.slice(0, 6) : [
    { id: 'global-room', name: 'Global Lounge', type: 'Public' },
    { id: 'group-dev', name: 'Guranda Dev Team', type: 'Group' },
    { id: 'ai-assistant', name: 'Guranda AI', type: 'AI' },
  ];

  const { isInstalled } = useStore();
  const recommended = MINI_APP_IDS.map(id => MODULES.find(m => m.id === id)).filter(Boolean).slice(0, 8) as LifeModule[];

  const openChat = (item: any) => {
    const companionId = AI_ENABLED ? FIXED_COMPANION_IDS[item.id] : undefined;
    if (companionId) {
      navigation.navigate('CompanionChat', { companionId, companionName: item.name });
      return;
    }
    navigation.navigate('Chat', {
      screen: 'ChatRoom',
      params: { roomId: item.id, roomName: item.name, roomType: item.type, targetUserId: item.targetUserId },
    });
  };

  const openGame = (game: typeof GAMES[number]) => {
    if (!game.live) {
      navigation.navigate('UnderConstruction', {
        name: game.name,
        icon: game.icon,
        tagline: game.blurb,
        description: `${game.name} is being built for the ${BRAND.name} Arcade. You'll be able to play, compete in tournaments and earn rewards with your one identity.`,
        features: game.features,
      });
    } else if (isInstalled(game.id)) {
      navigation.navigate('Life', { screen: game.route! });
    } else {
      // Not installed yet — the install prompt lives on the Games screen itself.
      navigation.navigate('Life', { screen: 'Games' });
    }
  };

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, RADIUS, SPACING }) => ({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.lg,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 2,
      borderColor: COLORS.primary,
      backgroundColor: COLORS.surface,
    },
    greeting: {
      ...TYPOGRAPHY.caption,
      fontSize: 13,
    },
    userName: {
      ...TYPOGRAPHY.h3,
      fontWeight: '700',
    },
    brandWrap: {
      flexDirection: 'row',
    },
    brandLife: {
      fontSize: 22,
      fontWeight: '800',
      color: COLORS.text,
      letterSpacing: -0.5,
    },
    brandOS: {
      fontSize: 22,
      fontWeight: '800',
      color: COLORS.primary,
      letterSpacing: -0.5,
    },
    walletCard: {
      borderRadius: RADIUS.xl,
      padding: SPACING.lg,
      borderWidth: 1,
      borderColor: 'rgba(139, 92, 246, 0.35)',
    },
    walletTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    walletLabel: {
      color: 'rgba(255,255,255,0.65)',
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1.2,
      marginBottom: 6,
    },
    walletBalance: {
      color: '#FFF',
      fontSize: 34,
      fontWeight: '800',
      letterSpacing: -1,
    },
    walletCurrency: {
      fontSize: 16,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.7)',
    },
    walletIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.15)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    walletActions: {
      flexDirection: 'row',
      gap: SPACING.sm,
      marginTop: SPACING.lg,
    },
    walletBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255,255,255,0.15)',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: RADIUS.pill,
    },
    walletBtnGhost: {
      backgroundColor: 'rgba(255,255,255,0.07)',
    },
    walletBtnText: {
      color: '#FFF',
      fontSize: 13,
      fontWeight: '600',
    },
    onlineStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginHorizontal: SPACING.lg,
      marginTop: SPACING.md,
      backgroundColor: COLORS.glass,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    onlineDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: COLORS.success,
    },
    onlineText: {
      ...TYPOGRAPHY.body2,
      flex: 1,
      fontSize: 13,
    },
    liveHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      marginTop: SPACING.xl,
      marginBottom: SPACING.md,
    },
    liveHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    liveDotSmall: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#FF3B30',
    },
    liveHeaderTitle: {
      ...TYPOGRAPHY.h3,
      fontWeight: '600',
    },
    goLivePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: RADIUS.pill,
    },
    goLivePillText: {
      color: '#FFF',
      fontWeight: '700',
      fontSize: 12,
    },
    seeAllLiveCard: {
      width: 90,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
    },
    seeAllLiveText: {
      color: COLORS.secondary,
      fontSize: 12,
      fontWeight: '600',
    },
    moduleGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      rowGap: SPACING.md,
    },
    hList: {
      paddingHorizontal: SPACING.lg,
      gap: SPACING.md,
    },
    chatCard: {
      width: 110,
      backgroundColor: COLORS.glass,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
      alignItems: 'center',
    },
    chatAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: COLORS.surface,
      marginBottom: SPACING.sm,
    },
    chatName: {
      color: COLORS.text,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
    },
    chatType: {
      ...TYPOGRAPHY.caption,
      fontSize: 10,
      marginTop: 2,
    },
    gameCard: {
      width: 160,
      height: 100,
      borderRadius: RADIUS.lg,
      padding: 14,
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
    },
    gameName: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: '700',
    },
    gameLive: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 10,
      fontWeight: '700',
      marginTop: 3,
    },
    communityCard: {
      width: 140,
      backgroundColor: COLORS.glass,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
    },
    communityIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: 'rgba(34, 211, 238, 0.12)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    communityName: {
      color: COLORS.text,
      fontSize: 14,
      fontWeight: '600',
    },
    communityMembers: {
      ...TYPOGRAPHY.caption,
      fontSize: 11,
      marginTop: 2,
    },
    emptyCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      marginHorizontal: SPACING.lg,
      backgroundColor: COLORS.glass,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md,
      paddingVertical: SPACING.lg,
    },
    emptyCardText: {
      ...TYPOGRAPHY.body2,
      color: COLORS.secondary,
      fontWeight: '600',
    },
    eventRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      backgroundColor: COLORS.glass,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md,
      padding: 14,
    },
    eventIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    eventTitle: {
      color: COLORS.text,
      fontSize: 14,
      fontWeight: '600',
    },
    eventWhen: {
      ...TYPOGRAPHY.caption,
      fontSize: 12,
      marginTop: 2,
    },
    achievementCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      backgroundColor: COLORS.glass,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md,
      padding: 14,
    },
    achievementBadges: {
      flexDirection: 'row',
      gap: 2,
    },
    achievementEmoji: {
      fontSize: 22,
    },
    missionFooter: {
      alignItems: 'center',
      marginTop: SPACING.xxl,
    },
    missionText: {
      ...TYPOGRAPHY.caption,
      letterSpacing: 2,
      textTransform: 'uppercase',
      fontSize: 11,
    },
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ===== Header ===== */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={{ uri: user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${user?.username || 'lifeos'}` }}
              style={styles.avatar}
            />
            <View>
              <Text style={styles.greeting}>{greeting},</Text>
              <Text style={styles.userName}>{displayName}</Text>
            </View>
          </View>
          <View style={styles.brandWrap}>
            <Text style={styles.brandLife}>Gura</Text>
            <Text style={styles.brandOS}>nda</Text>
          </View>
        </View>

        <ResumeSessionBanner navigation={navigation} />

        {/* ===== Wallet hero ===== */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('WalletHome')}
          style={{ marginHorizontal: SPACING.lg }}
        >
          <LinearGradient
            colors={GRADIENTS.wallet}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.walletCard}
          >
            <View style={styles.walletTop}>
              <View>
                <Text style={styles.walletLabel}>ONE WALLET · ONE ECONOMY</Text>
                <Text style={styles.walletBalance}>
                  {formatCurrency(wallet?.balanceMasheleni ?? 0)}
                </Text>
              </View>
              <View style={styles.walletIcon}>
                <Ionicons name="wallet" size={24} color="#FFF" />
              </View>
            </View>
            <View style={styles.walletActions}>
              <TouchableOpacity
                style={styles.walletBtn}
                onPress={() => navigation.navigate('Send')}
              >
                <Ionicons name="send" size={14} color="#FFF" />
                <Text style={styles.walletBtnText}>Send</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.walletBtn}
                onPress={() => navigation.navigate('WalletHome')}
              >
                <Ionicons name="stats-chart" size={14} color="#FFF" />
                <Text style={styles.walletBtnText}>Activity</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.walletBtn, styles.walletBtnGhost]}
                onPress={() => navigation.navigate('UnderConstruction', { moduleId: 'finance' })}
              >
                <Text style={styles.walletBtnText}>Invest 🚧</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ===== Friends online strip ===== */}
        <TouchableOpacity
          style={styles.onlineStrip}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Chat')}
        >
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>
            {onlineCount > 0
              ? `${onlineCount} friend${onlineCount === 1 ? '' : 's'} online now`
              : 'Your friends will appear here when online'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* ===== Live Now ===== */}
        <View style={styles.liveHeaderRow}>
          <View style={styles.liveHeaderLeft}>
            <View style={styles.liveDotSmall} />
            <Text style={styles.liveHeaderTitle}>Live Now</Text>
          </View>
          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('GoLive')}>
            <LinearGradient colors={GRADIENTS.live} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.goLivePill}>
              <Ionicons name="radio" size={12} color="#FFF" />
              <Text style={styles.goLivePillText}>Go Live</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <FlatList
          horizontal
          data={[...realRooms, ...MOCK_STREAMS].slice(0, 6)}
          keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hList}
          renderItem={({ item }) => (
            <LiveStreamCard stream={item} size="compact" onPress={stream => enterLiveStream(stream, user?.userId, navigation)} />
          )}
          ListFooterComponent={
            <TouchableOpacity style={styles.seeAllLiveCard} onPress={() => navigation.navigate('Live')}>
              <Ionicons name="arrow-forward-circle" size={22} color={COLORS.secondary} />
              <Text style={styles.seeAllLiveText}>See all</Text>
            </TouchableOpacity>
          }
        />

        {/* ===== Your Life — the 4 top-level doors, same as the Life tab ===== */}
        <SectionHeader title="Your Life" onSeeAll={() => navigation.navigate('Life')} />
        <View style={styles.moduleGrid}>
          {YOUR_LIFE_ITEMS.map(m => (
            <ModuleCard key={m.id} module={m} onPress={mod => navigation.navigate(mod.route!.name, mod.route!.params)} />
          ))}
        </View>

        {/* ===== Continue chatting ===== */}
        <SectionHeader title="Continue chatting" onSeeAll={() => navigation.navigate('Chat')} />
        <FlatList
          horizontal
          data={recentChats}
          keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hList}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.chatCard} activeOpacity={0.8} onPress={() => openChat(item)}>
              <Image
                source={{ uri: `https://api.dicebear.com/7.x/avataaars/png?seed=${item.name}` }}
                style={styles.chatAvatar}
              />
              <Text style={styles.chatName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.chatType}>{item.type}</Text>
            </TouchableOpacity>
          )}
        />

        {/* ===== Games ===== */}
        <SectionHeader
          title="Games"
          onSeeAll={() => navigation.navigate('Life', { screen: 'Games' })}
        />
        <FlatList
          horizontal
          data={GAMES}
          keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hList}
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={0.85} onPress={() => openGame(item)}>
              <LinearGradient
                colors={item.live ? item.gradient : [COLORS.surfaceElevated, COLORS.surface]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gameCard}
              >
                <Ionicons name={item.icon as any} size={30} color={item.live ? '#FFF' : COLORS.textMuted} />
                <View>
                  <Text style={[styles.gameName, !item.live && { color: COLORS.textMuted }]}>{item.name}</Text>
                  {!item.live
                    ? <ConstructionBadge compact />
                    : isInstalled(item.id)
                      ? <Text style={styles.gameLive}>INSTALLED</Text>
                      : <Text style={styles.gameLive}>GET</Text>}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}
        />

        {/* ===== Communities ===== */}
        <SectionHeader
          title="Communities"
          onSeeAll={() => navigation.navigate('Main', { screen: 'Chat', params: { screen: 'ChatList' } })}
        />
        {communities.length > 0 ? (
          <FlatList
            horizontal
            data={communities.slice(0, 8)}
            keyExtractor={item => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.communityCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Community', { communityId: item.id, communityName: item.name })}
              >
                <View style={styles.communityIcon}>
                  <Ionicons name="earth" size={20} color={COLORS.secondary} />
                </View>
                <Text style={styles.communityName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.communityMembers}>
                  {item._count?.members || 0} members
                </Text>
              </TouchableOpacity>
            )}
          />
        ) : (
          <TouchableOpacity
            style={styles.emptyCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('CreateCommunity')}
          >
            <Ionicons name="add-circle" size={22} color={COLORS.secondary} />
            <Text style={styles.emptyCardText}>Create the first community</Text>
          </TouchableOpacity>
        )}

        {/* ===== Trending & events ===== */}
        <SectionHeader title="Upcoming events" />
        <View style={{ paddingHorizontal: SPACING.lg, gap: SPACING.md }}>
          {EVENTS.map(ev => (
            <View key={ev.id} style={styles.eventRow}>
              <View style={[styles.eventIcon, { backgroundColor: ev.color + '22' }]}>
                <Ionicons name={ev.icon as any} size={20} color={ev.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.eventTitle}>{ev.title}</Text>
                <Text style={styles.eventWhen}>{ev.when}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </View>
          ))}
        </View>

        {/* ===== Achievements ===== */}
        <SectionHeader title="Achievements" onSeeAll={() => navigation.navigate('Profile')} seeAllLabel="Profile" />
        <View style={{ paddingHorizontal: SPACING.lg }}>
          <View style={styles.achievementCard}>
            <View style={styles.achievementBadges}>
              <Text style={styles.achievementEmoji}>🏆</Text>
              <Text style={styles.achievementEmoji}>💎</Text>
              <Text style={styles.achievementEmoji}>🎮</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.eventTitle}>Guranda Pioneer</Text>
              <Text style={styles.eventWhen}>3 badges earned · Level 2 · 340 XP</Text>
            </View>
          </View>
        </View>

        {/* ===== Explore Mini Apps ===== */}
        <SectionHeader
          title="Explore Mini Apps"
          onSeeAll={() => navigation.navigate('Life', { screen: 'Hub', params: { mode: 'store' } })}
        />
        <FlatList
          horizontal
          data={recommended}
          keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hList}
          renderItem={({ item }) => (
            <ModuleCard
              module={item}
              size="wide"
              onPress={() => navigation.navigate('Life', { screen: 'Hub', params: { mode: 'store' } })}
            />
          )}
        />

        {/* ===== Mission footer ===== */}
        <View style={styles.missionFooter}>
          <Text style={styles.missionText}>{BRAND.tagline}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

