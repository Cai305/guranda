import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Modal, TouchableWithoutFeedback, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { MODULES, LifeModule, MINI_APP_IDS } from '../config/modules';
import { useStore } from '../context/StoreContext';
import { fetchApi } from '../utils/api';

import { GAMES } from './hub/GamesScreen';

export default function HubScreen({ route, navigation }: any) {
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const { installApp, uninstallApp, isInstalled } = useStore();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<LifeModule | null>(null);
  const [communityApps, setCommunityApps] = useState<LifeModule[]>([]);
  const [communityGameIds, setCommunityGameIds] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState<'all' | 'apps' | 'games' | 'community'>('all');
  const [featuredIndex, setFeaturedIndex] = useState(0);

  const mode = route?.params?.mode || 'store';

  const styles = useThemedStyles(({ COLORS, SPACING, TYPOGRAPHY }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    mainHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.md,
      paddingBottom: SPACING.sm,
    },
    mainTitle: {
      fontSize: 34,
      fontWeight: 'bold',
      color: COLORS.text,
      letterSpacing: -0.5,
    },
    profileAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: COLORS.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: COLORS.surfaceElevated,
      marginHorizontal: SPACING.lg,
      marginVertical: SPACING.sm,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    searchInput: { flex: 1, color: COLORS.text, fontSize: 16 },
    categoryRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.md,
    },
    categoryChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    categoryChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    categoryChipText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 12.5 },
    categoryChipTextActive: { color: '#fff' },
    sectionLabel: {
      ...TYPOGRAPHY.label,
      fontSize: 11,
      paddingHorizontal: SPACING.lg,
      marginTop: SPACING.xl,
      marginBottom: SPACING.md,
    },

    // App Rows
    appRowContainer: { paddingVertical: 4 },
    appRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    appIcon: {
      width: 62,
      height: 62,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    appInfo: { flex: 1, justifyContent: 'center' },
    appName: { color: COLORS.text, fontSize: 16, fontWeight: '500', marginBottom: 2 },
    appTagline: { color: COLORS.textMuted, fontSize: 13 },
    btnGet: {
      backgroundColor: COLORS.surfaceElevated,
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 16,
      minWidth: 70,
      alignItems: 'center',
    },
    btnGetText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
    btnOpen: {
      backgroundColor: COLORS.surfaceElevated,
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 16,
      minWidth: 70,
      alignItems: 'center',
    },
    btnOpenText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: COLORS.border,
      marginLeft: 74,
      marginTop: 10,
      marginBottom: 4,
    },

    // Horizontal Groups
    groupContainer: { paddingTop: SPACING.sm },
    groupHeader: { paddingHorizontal: SPACING.lg, marginBottom: 12 },
    groupSubtitle: { color: COLORS.primary, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
    groupTitle: { color: COLORS.text, fontSize: 22, fontWeight: 'bold', letterSpacing: -0.3 },
    sectionDivider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginHorizontal: SPACING.lg, marginVertical: SPACING.xl },

    // Featured
    featuredContainer: { paddingTop: SPACING.sm },
    featuredCard: {
      height: 240,
      borderRadius: 16,
      overflow: 'hidden',
    },
    featuredGradient: {
      ...StyleSheet.absoluteFill,
      justifyContent: 'center',
      alignItems: 'center',
    },
    featuredOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: SPACING.lg,
      paddingTop: 40,
    },
    featuredName: { color: '#fff', fontSize: 24, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3, letterSpacing: -0.5 },
    featuredTagline: { color: 'rgba(255,255,255,0.9)', fontSize: 15, marginTop: 2, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
    dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 },
    dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.border },
    dotActive: { width: 14, borderRadius: 3, backgroundColor: COLORS.primary },

    empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
    emptyText: { color: COLORS.textMuted, fontSize: 14 },

    // Modal
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
    sheetTagline: { color: COLORS.textMuted, fontSize: 14, marginBottom: 12, textAlign: 'center' },
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

  // Third-party apps published via Profile > Developer Hub — the built-in
  // catalog above (MODULES/GAMES) already covers every native module, so
  // this only pulls in genuine external web apps (isNative: false).
  useEffect(() => {
    fetchApi('/store/apps')
      .then(res => (res.ok ? res.json() : []))
      .then((apps: any[]) => {
        if (!Array.isArray(apps)) return;
        const mapped: LifeModule[] = apps
          .filter(a => !a.isNative && a.sourceUrl)
          .map(a => ({
            id: a.id,
            name: a.name,
            icon: a.iconUrl || 'apps',
            gradient: [a.color || COLORS.primary, a.color || COLORS.primary],
            status: 'live',
            tagline: a.description || 'Community mini-app',
            description: a.description || '',
            features: [],
            route: { name: 'ExternalApp', params: { sourceUrl: a.sourceUrl, name: a.name } },
          }));
        setCommunityApps(mapped);
        setCommunityGameIds(new Set(apps.filter(a => !a.isNative && a.sourceUrl && a.type === 'Game').map(a => a.id)));
      })
      .catch(() => {});
  }, []);

  // Mini apps
  const baseMiniApps = MINI_APP_IDS.map(id => MODULES.find(m => m.id === id)).filter(Boolean) as LifeModule[];
  
  // Games as modules
  const gamesAsModules: LifeModule[] = GAMES.map(g => ({
    id: g.id,
    name: g.name,
    icon: g.icon,
    gradient: g.gradient,
    tagline: g.blurb,
    status: g.live ? 'live' : 'construction',
    description: g.blurb,
    features: g.features,
    route: g.live ? { name: g.route! } : undefined
  }));

  const allStoreModules = mode === 'store' ? [...baseMiniApps, ...gamesAsModules, ...communityApps] : baseMiniApps;
  const installedModules = baseMiniApps.filter(m => isInstalled(m.id));
  
  const searched = allStoreModules.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.tagline.toLowerCase().includes(search.toLowerCase()),
  );
  const filtered = search
    ? searched
    : searched.filter(m => {
        if (category === 'all') return true;
        if (category === 'apps') return baseMiniApps.some(b => b.id === m.id);
        if (category === 'games') return gamesAsModules.some(g => g.id === m.id) || communityGameIds.has(m.id);
        return communityApps.some(c => c.id === m.id) && !communityGameIds.has(m.id);
      });

  const openModule = (module: LifeModule) => {
    if (module.route) {
      navigation.navigate(module.route.name, module.route.params);
    } else {
      navigation.navigate('UnderConstruction', { moduleId: module.id });
    }
  };

  const handlePress = (module: LifeModule) => {
    if (isInstalled(module.id)) {
      openModule(module);
    } else {
      setModal(module);
    }
  };

  const handleInstall = () => {
    if (!modal) return;
    installApp(modal.id);
    setModal(null);
  };

  const handleUninstall = (module: LifeModule) => {
    setModal(null);
    uninstallApp(module.id);
  };

  // Rendering helpers for iOS App Store look
  const renderAppRow = (m: LifeModule, showDivider = false) => {
    const installed = isInstalled(m.id);
    const isConstruction = m.status === 'construction';

    return (
      <View key={m.id} style={styles.appRowContainer}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => handlePress(m)} style={styles.appRow}>
          <LinearGradient
            colors={isConstruction ? [COLORS.surfaceElevated, COLORS.surface] : m.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.appIcon}
          >
            <Ionicons name={m.icon as any} size={32} color={isConstruction ? m.gradient[0] : '#fff'} />
          </LinearGradient>
          <View style={styles.appInfo}>
            <Text style={styles.appName} numberOfLines={1}>{m.name}</Text>
            <Text style={styles.appTagline} numberOfLines={1}>{m.tagline}</Text>
          </View>
          {installed ? (
            <TouchableOpacity style={styles.btnOpen} onPress={() => openModule(m)}>
              <Text style={styles.btnOpenText}>OPEN</Text>
            </TouchableOpacity>
          ) : isConstruction ? (
            <TouchableOpacity style={styles.btnGet} onPress={() => setModal(m)}>
              <Text style={styles.btnGetText}>INFO</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.btnGet} onPress={() => setModal(m)}>
              <Text style={styles.btnGetText}>GET</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
        {showDivider && <View style={styles.divider} />}
      </View>
    );
  };

  const renderHorizontalGroup = (title: string, subtitle: string, apps: LifeModule[]) => {
    if (apps.length === 0) return null;
    
    // Group apps into chunks of 3 for vertical columns
    const chunks = [];
    for (let i = 0; i < apps.length; i += 3) {
      chunks.push(apps.slice(i, i + 3));
    }
    
    const itemWidth = width - SPACING.lg * 2 - 20;

    return (
      <View style={styles.groupContainer}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupSubtitle}>{subtitle.toUpperCase()}</Text>
          <Text style={styles.groupTitle}>{title}</Text>
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          snapToInterval={itemWidth + SPACING.md} 
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: SPACING.md, paddingBottom: 10 }}
        >
          {chunks.map((chunk, idx) => (
            <View key={idx} style={{ width: itemWidth }}>
              {chunk.map((m, i) => renderAppRow(m, i < chunk.length - 1))}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderFeatured = (apps: LifeModule[]) => {
    if (apps.length === 0) return null;
    // Leaves a peek of the next card and reports scroll position via dots —
    // full-bleed-with-no-hint made this the one carousel in the Store no one
    // discovered was scrollable.
    const cardWidth = width - SPACING.lg * 2 - 28;
    const step = cardWidth + SPACING.md;

    return (
      <View style={styles.featuredContainer}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupSubtitle}>DISCOVER</Text>
          <Text style={styles.groupTitle}>Featured Apps & Games</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={step}
          decelerationRate="fast"
          onScroll={(e) => setFeaturedIndex(Math.round(e.nativeEvent.contentOffset.x / step))}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: SPACING.md }}
        >
          {apps.map(m => (
            <TouchableOpacity key={m.id} activeOpacity={0.9} onPress={() => handlePress(m)} style={{ width: cardWidth }}>
              <View style={styles.featuredCard}>
                <LinearGradient
                  colors={m.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.featuredGradient}
                >
                  <Ionicons name={m.icon as any} size={72} color="#fff" style={{ opacity: 0.9 }} />
                </LinearGradient>
                <View style={styles.featuredOverlay}>
                  <Text style={styles.featuredName}>{m.name}</Text>
                  <Text style={styles.featuredTagline} numberOfLines={1}>{m.tagline}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {apps.length > 1 && (
          <View style={styles.dotsRow}>
            {apps.map((_, i) => (
              <View key={i} style={[styles.dot, i === featuredIndex && styles.dotActive]} />
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {mode === 'store' && (
        <View style={styles.mainHeader}>
          <Text style={styles.mainTitle}>Store</Text>
          <View style={styles.profileAvatar}>
            <Ionicons name="person" size={16} color="#fff" />
          </View>
        </View>
      )}

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Games, Apps, and More"
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {mode === 'installed-miniapps' && (
          <View style={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.md }}>
            <Text style={[styles.sectionLabel, { paddingHorizontal: 0 }]}>INSTALLED MINI APPS</Text>
            {installedModules.length === 0 ? (
              <Text style={{ color: COLORS.textMuted }}>No mini apps installed.</Text>
            ) : (
              <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: SPACING.md, marginTop: SPACING.sm }}>
                {installedModules.map((m, i) => renderAppRow(m, i < installedModules.length - 1))}
              </View>
            )}
          </View>
        )}

        {mode === 'store' && !search && (
          <>
            <View style={styles.categoryRow}>
              {([
                ['all', 'All'],
                ['apps', 'Apps'],
                ['games', 'Games'],
                ['community', 'Community'],
              ] as const).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.categoryChip, category === key && styles.categoryChipActive]}
                  onPress={() => setCategory(key)}
                >
                  <Text style={[styles.categoryChipText, category === key && styles.categoryChipTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {category === 'all' && (
              <>
                {renderFeatured(filtered.filter(m => m.status === 'live').slice(0, 3))}
                <View style={styles.sectionDivider} />
              </>
            )}

            {(category === 'all' || category === 'apps') && (
              <>
                {renderHorizontalGroup(
                  "Must-Have Apps",
                  "Essentials",
                  filtered.filter(m => baseMiniApps.some(b => b.id === m.id) && m.status !== 'construction')
                )}
                <View style={styles.sectionDivider} />
              </>
            )}

            {(category === 'all' || category === 'games') && (
              <>
                {renderHorizontalGroup(
                  "Great Games",
                  "Play Now",
                  filtered.filter(m => (gamesAsModules.some(b => b.id === m.id) || communityGameIds.has(m.id)) && m.status !== 'construction')
                )}
                <View style={styles.sectionDivider} />

                {renderHorizontalGroup(
                  "Coming Soon",
                  "Sneak Peek",
                  filtered.filter(m => m.status === 'construction')
                )}
                <View style={styles.sectionDivider} />
              </>
            )}

            {(category === 'all' || category === 'community') && (
              renderHorizontalGroup(
                "Community Apps",
                "From Developers",
                filtered.filter(m => communityApps.some(c => c.id === m.id) && !communityGameIds.has(m.id))
              )
            )}

            {filtered.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="apps-outline" size={40} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>Nothing in this category yet</Text>
              </View>
            )}
          </>
        )}

        {mode === 'store' && search.length > 0 && (
          <View style={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.md }}>
            <Text style={styles.groupTitle}>Results</Text>
            <View style={{ height: SPACING.md }} />
            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="search" size={40} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No results found</Text>
              </View>
            ) : (
              <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: SPACING.md }}>
                {filtered.map((m, i) => renderAppRow(m, i < filtered.length - 1))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Install / uninstall modal */}
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
                    <Text style={styles.sheetTagline}>{modal.tagline}</Text>
                    <Text style={styles.sheetDesc}>{modal.description}</Text>
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

                    {isInstalled(modal.id) ? (
                      <View style={styles.sheetButtons}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => handleUninstall(modal)}>
                          <Text style={[styles.cancelText, { color: '#ef4444' }]}>Uninstall</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.installBtn} onPress={() => { setModal(null); openModule(modal); }}>
                          <LinearGradient colors={modal.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.installGradient}>
                            <Ionicons name="open-outline" size={16} color="#fff" />
                            <Text style={styles.installText}>Open</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.sheetButtons}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(null)}>
                          <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.installBtn} onPress={handleInstall}>
                          <LinearGradient colors={modal.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.installGradient}>
                            <Ionicons name="cloud-download-outline" size={16} color="#fff" />
                            <Text style={styles.installText}>Install</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    )}
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
