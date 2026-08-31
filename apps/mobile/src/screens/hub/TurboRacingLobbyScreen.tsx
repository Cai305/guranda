import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import io, { Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { API_BASE_URL, fetchApi } from '../../utils/api';
import {
  UpgradeStat, MAX_UPGRADE_LEVEL, costForLevel, accelFor, handlingFor,
  engineNameFor, CAR_COLORS, DEFAULT_CAR_COLOR,
} from '@mxit2/types';
import F1Car from '../../games/turboRacing/F1Car';
import SessionHeaderActions from '../../components/SessionHeaderActions';

const STATS: { key: UpgradeStat; label: string; icon: string; levelField: 'speedLevel' | 'accelLevel' | 'handlingLevel' }[] = [
  { key: 'speed', label: 'Engine', icon: 'speedometer', levelField: 'speedLevel' },
  { key: 'acceleration', label: 'Acceleration', icon: 'rocket', levelField: 'accelLevel' },
  { key: 'handling', label: 'Handling', icon: 'swap-horizontal', levelField: 'handlingLevel' },
];

export default function TurboRacingLobbyScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, GRADIENTS, TYPOGRAPHY } = theme;
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [upgrades, setUpgrades] = useState<{ speedLevel: number; accelLevel: number; handlingLevel: number; color: string }>({
    speedLevel: 0, accelLevel: 0, handlingLevel: 0, color: DEFAULT_CAR_COLOR,
  });
  const [buying, setBuying] = useState<UpgradeStat | null>(null);
  const [pickingColor, setPickingColor] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [searching, setSearching] = useState(false);

  const loadData = () => {
    fetchApi('/wallets/me')
      .then(res => (res.ok ? res.json() : null))
      .then(w => w && setBalance(Math.floor(w.balanceMasheleni)))
      .catch(() => {});
    fetchApi('/turbo-racing/upgrades/me')
      .then(res => (res.ok ? res.json() : null))
      .then(u => u && setUpgrades(u))
      .catch(() => {});
  };

  useFocusEffect(useCallback(loadData, []));

  useEffect(() => {
    const sock = io(`${API_BASE_URL}/turbo-racing`);
    setSocket(sock);
    sock.on('match_found', (data: { raceId: string }) => {
      setSearching(false);
      navigation.navigate('TurboRacingGame', { raceId: data.raceId });
    });
    return () => { sock.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const findOnline = () => {
    if (!socket || !user || searching) return;
    setSearching(true);
    socket.emit('join_queue', { userId: user.userId, displayName: user.displayName || user.username || 'Player' });
  };

  const cancelSearch = () => {
    socket?.emit('leave_queue');
    setSearching(false);
  };

  const buyUpgrade = async (stat: UpgradeStat) => {
    setBuying(stat);
    try {
      const res = await fetchApi('/turbo-racing/upgrades/buy', {
        method: 'POST',
        body: JSON.stringify({ stat }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUpgrades(updated);
        loadData();
      }
    } finally {
      setBuying(null);
    }
  };

  const pickColor = async (color: string) => {
    if (color === upgrades.color) return;
    setPickingColor(true);
    setUpgrades(prev => ({ ...prev, color })); // optimistic — it's free, no reason to wait
    try {
      await fetchApi('/turbo-racing/upgrades/color', {
        method: 'POST',
        body: JSON.stringify({ color }),
      });
    } finally {
      setPickingColor(false);
    }
  };

  const styles = useThemedStyles(({ COLORS, SPACING, RADIUS, TYPOGRAPHY }) => ({
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
    heroTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800', marginTop: 8 },
    heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 19 },
    sectionLabel: {
      ...TYPOGRAPHY.label, fontSize: 11,
      paddingHorizontal: SPACING.lg,
      marginTop: SPACING.xl, marginBottom: SPACING.md,
    },
    colorRow: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 12,
      paddingHorizontal: SPACING.lg,
    },
    colorSwatch: {
      width: 36, height: 36, borderRadius: 18,
      borderWidth: 2, borderColor: 'transparent',
      justifyContent: 'center', alignItems: 'center',
    },
    colorSwatchActive: { borderColor: '#fff' },
    garage: {
      marginHorizontal: SPACING.lg,
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      padding: 12,
      gap: 12,
    },
    statRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    statIcon: {
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: 'rgba(239,68,68,0.15)',
      justifyContent: 'center', alignItems: 'center',
    },
    statLabel: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    statMeta: { color: COLORS.textMuted, fontSize: 11.5, marginTop: 2 },
    buyBtn: {
      backgroundColor: '#EF4444',
      borderRadius: RADIUS.pill,
      paddingHorizontal: 14,
      paddingVertical: 8,
      minWidth: 74,
      alignItems: 'center',
    },
    buyBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.08)' },
    buyBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
    playBtn: {
      flexDirection: 'row', gap: 10,
      marginHorizontal: SPACING.lg,
      backgroundColor: '#E53935',
      borderRadius: RADIUS.pill,
      paddingVertical: 14,
      justifyContent: 'center', alignItems: 'center',
    },
    playText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
    rules: {
      marginHorizontal: SPACING.lg,
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      padding: 14,
      gap: 12,
    },
    ruleRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    ruleNum: {
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: 'rgba(229,57,53,0.25)',
      color: '#E53935', fontWeight: '800', fontSize: 12,
      textAlign: 'center', lineHeight: 22,
      overflow: 'hidden',
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
              id: 'racing',
              label: 'Turbo Racing',
              icon: 'speedometer',
              gradient: GRADIENTS.crimson,
              route: { name: 'Main', params: { screen: 'Life', params: { screen: 'TurboRacingLobby' } } },
            }}
          />
          <Text style={TYPOGRAPHY.h2}>Turbo Racing</Text>
          <View style={{ width: 40 }} />
        </View>

        <LinearGradient colors={['#7F1D1D', '#2E0A0A']} style={styles.hero}>
          <F1Car color={upgrades.color} size={64} />
          <Text style={styles.heroTitle}>Arcade Street Racing</Text>
          <Text style={styles.heroSub}>
            Dodge traffic, grab boosts, race a real opponent to the finish line.
            Collect coins and win to earn MSH.
          </Text>
        </LinearGradient>

        <Text style={styles.sectionLabel}>CAR COLOR</Text>
        <View style={styles.colorRow}>
          {CAR_COLORS.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.colorSwatch, { backgroundColor: c }, upgrades.color === c && styles.colorSwatchActive]}
              onPress={() => pickColor(c)}
              disabled={pickingColor}
            >
              {upgrades.color === c && <Ionicons name="checkmark" size={16} color={c === '#FFFFFF' ? '#000' : '#fff'} />}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>
          GARAGE {balance !== null ? `· BALANCE ${balance} MSH` : ''}
        </Text>
        <View style={styles.garage}>
          {STATS.map(s => {
            const level = upgrades[s.levelField];
            const maxed = level >= MAX_UPGRADE_LEVEL;
            const cost = costForLevel(level + 1);
            const meta = s.key === 'speed'
              ? maxed ? engineNameFor(level) : `${engineNameFor(level)} → ${engineNameFor(level + 1)}`
              : `Level ${level}/${MAX_UPGRADE_LEVEL} · ${(s.key === 'acceleration' ? accelFor(level) : handlingFor(level)).toFixed(1)}`;
            return (
              <View key={s.key} style={styles.statRow}>
                <View style={styles.statIcon}>
                  <Ionicons name={s.icon as any} size={20} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statLabel}>{s.label}</Text>
                  <Text style={styles.statMeta} numberOfLines={1}>{meta}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.buyBtn, maxed && styles.buyBtnDisabled]}
                  onPress={() => buyUpgrade(s.key)}
                  disabled={maxed || buying === s.key}
                >
                  {buying === s.key ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.buyBtnText}>{maxed ? 'MAX' : `${cost} MSH`}</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>PLAYER VS PLAYER</Text>
        <TouchableOpacity
          style={[styles.playBtn, { backgroundColor: searching ? '#333' : '#0EA5E9' }]}
          onPress={searching ? cancelSearch : findOnline}
        >
          {searching ? (
            <>
              <ActivityIndicator color={COLORS.gold} size="small" />
              <Text style={styles.playText}>Searching for a racer… tap to cancel</Text>
            </>
          ) : (
            <>
              <Ionicons name="globe-outline" size={20} color="#FFF" />
              <Text style={styles.playText}>Play Online</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>HOW TO PLAY</Text>
        <View style={styles.rules}>
          {[
            'Tap the left/right edges of the track to switch lanes.',
            'Dodge oncoming traffic — hitting one slows you down hard.',
            'Grab coins for MSH and lightning bolts for a speed boost.',
            'First to the finish line wins — coins + placement pay out in MSH.',
            'Every car starts on a plain 1.0 TSI Turbo — upgrade the engine, acceleration and handling in the Garage, and repaint it any color for free.',
          ].map((r, i) => (
            <View key={i} style={styles.ruleRow}>
              <Text style={styles.ruleNum}>{i + 1}</Text>
              <Text style={styles.ruleText}>{r}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
