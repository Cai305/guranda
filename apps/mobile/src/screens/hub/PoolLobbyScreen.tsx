import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import io, { Socket } from 'socket.io-client';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, GRADIENTS } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL, fetchApi } from '../../utils/api';
import type { PoolDifficulty } from '../../games/pool/ai';
import SessionHeaderActions from '../../components/SessionHeaderActions';

const DIFFICULTIES: { key: PoolDifficulty; label: string; blurb: string }[] = [
  { key: 'easy', label: 'Easy', blurb: 'Loose aim, forgiving' },
  { key: 'medium', label: 'Medium', blurb: 'Solid shot-maker' },
  { key: 'hard', label: 'Hard', blurb: 'Barely misses' },
];

const WAGERS = [0, 10, 25, 50];

export default function PoolLobbyScreen({ navigation }: any) {
  const { user } = useAuth();
  const [difficulty, setDifficulty] = useState<PoolDifficulty>('medium');
  const [wager, setWager] = useState(0);
  const [balance, setBalance] = useState<number | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchApi('/wallets/me')
      .then(res => (res.ok ? res.json() : null))
      .then(w => w && setBalance(Math.floor(w.balanceMasheleni)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const sock = io(`${API_BASE_URL}/pool`);
    setSocket(sock);
    sock.on('match_found', (data: { gameId: string }) => {
      setSearching(false);
      navigation.navigate('PoolGame', { mode: 'online', gameId: data.gameId, wager: 0 });
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

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <SessionHeaderActions
            navigation={navigation}
            session={{
              id: 'pool',
              label: '8-Ball Pool',
              icon: 'ellipse',
              gradient: GRADIENTS.emerald,
              route: { name: 'Main', params: { screen: 'Life', params: { screen: 'PoolLobby' } } },
            }}
          />
          <Text style={TYPOGRAPHY.h2}>8-Ball Pool</Text>
          <View style={{ width: 40 }} />
        </View>

        <LinearGradient colors={['#0B6E3C', '#06371E']} style={styles.hero}>
          <Text style={styles.heroEmoji}>🎱</Text>
          <Text style={styles.heroTitle}>Rack 'em up</Text>
          <Text style={styles.heroSub}>
            Classic 8-ball: pot your group, sink the eight, don't scratch.
            Wager MSH from your wallet for double-or-nothing stakes.
          </Text>
        </LinearGradient>

        <Text style={styles.sectionLabel}>VS AI</Text>
        <View style={styles.diffRow}>
          {DIFFICULTIES.map(d => (
            <TouchableOpacity
              key={d.key}
              style={[styles.diffCard, difficulty === d.key && styles.diffCardActive]}
              onPress={() => setDifficulty(d.key)}
            >
              <Text style={[styles.diffLabel, difficulty === d.key && { color: COLORS.text }]}>{d.label}</Text>
              <Text style={styles.diffBlurb}>{d.blurb}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>
          WAGER {balance !== null ? `· BALANCE ${balance} MSH` : ''}
        </Text>
        <View style={styles.wagerRow}>
          {WAGERS.map(w => (
            <TouchableOpacity
              key={w}
              style={[styles.wagerChip, wager === w && styles.wagerChipActive]}
              onPress={() => setWager(w)}
            >
              <Text style={[styles.wagerText, wager === w && { color: '#04291B' }]}>
                {w === 0 ? 'For fun' : `${w} MSH`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.wagerHint}>
          {wager > 0
            ? `Win to take ${wager * 2} MSH back — lose and the house keeps your stake.`
            : 'No stakes — just bragging rights.'}
        </Text>

        <TouchableOpacity
          style={styles.playBtn}
          onPress={() => navigation.navigate('PoolGame', { mode: 'ai', difficulty, wager })}
        >
          <Ionicons name="hardware-chip-outline" size={20} color="#FFF" />
          <Text style={styles.playText}>Play vs AI</Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>PLAYER VS PLAYER</Text>
        <TouchableOpacity
          style={[styles.playBtn, { backgroundColor: searching ? '#333' : '#0EA5E9', marginTop: 0 }]}
          onPress={searching ? cancelSearch : findOnline}
        >
          {searching ? (
            <>
              <ActivityIndicator color={COLORS.gold} size="small" />
              <Text style={styles.playText}>Searching for an opponent… tap to cancel</Text>
            </>
          ) : (
            <>
              <Ionicons name="globe-outline" size={20} color="#FFF" />
              <Text style={styles.playText}>Play Online</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.playBtn, { backgroundColor: '#7C3AED' }]}
          onPress={() => navigation.navigate('PoolGame', { mode: 'local', wager: 0 })}
          disabled={searching}
        >
          <Ionicons name="people-outline" size={20} color="#FFF" />
          <Text style={styles.playText}>2 Players — Same Device</Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>HOW TO PLAY</Text>
        <View style={styles.rules}>
          {[
            'Touch the table to aim — the dashed line shows your shot.',
            'Set power with the slider, then hit SHOOT.',
            'First potted ball decides your group: solids or stripes.',
            'Scratching gives your opponent ball in hand.',
            'Clear your group, then sink the 8-ball to win. Sink it early and you lose.',
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A1F12' },
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
  diffRow: { flexDirection: 'row', gap: 10, paddingHorizontal: SPACING.lg },
  diffCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.glassBorder,
    padding: 12,
    alignItems: 'center',
  },
  diffCardActive: { borderColor: '#0EA5E9', backgroundColor: 'rgba(14,165,233,0.15)' },
  diffLabel: { color: COLORS.textMuted, fontWeight: '800', fontSize: 14 },
  diffBlurb: { color: COLORS.textMuted, fontSize: 10, marginTop: 4, textAlign: 'center' },
  wagerRow: { flexDirection: 'row', gap: 10, paddingHorizontal: SPACING.lg },
  wagerChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.pill,
    borderWidth: 1, borderColor: COLORS.glassBorder,
    paddingVertical: 11,
    alignItems: 'center',
  },
  wagerChipActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  wagerText: { color: COLORS.textMuted, fontWeight: '800', fontSize: 13 },
  wagerHint: {
    color: COLORS.textMuted, fontSize: 11.5,
    paddingHorizontal: SPACING.lg, marginTop: 8,
  },
  playBtn: {
    flexDirection: 'row', gap: 10,
    marginHorizontal: SPACING.lg, marginTop: SPACING.md,
    backgroundColor: '#E53935',
    borderRadius: RADIUS.pill,
    paddingVertical: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  playText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  rules: {
    marginHorizontal: SPACING.lg,
    backgroundColor: 'rgba(255,255,255,0.06)',
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
});
