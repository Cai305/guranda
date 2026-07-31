import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import io, { Socket } from 'socket.io-client';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, GRADIENTS } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL, fetchApi } from '../../utils/api';
import SessionHeaderActions from '../../components/SessionHeaderActions';

// MoonBase 2.0 lobby — the legendary social world returns. Themed rooms
// with live occupancy, your customisable avatar, and upcoming events.

interface MoonRoom {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  occupancy: number;
}

const EVENTS = [
  { id: 'e1', title: 'Full Moon Party', when: 'Friday · 20:00', icon: 'moon' },
  { id: 'e2', title: 'Galaxy Trivia Night', when: 'Wednesday · 19:00', icon: 'help-circle' },
  { id: 'e3', title: 'Trade Post Flash Market', when: 'Saturday · 12:00', icon: 'pricetags' },
];

export default function MoonBaseScreen({ navigation }: any) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<MoonRoom[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const sock = io(`${API_BASE_URL}/moonbase`);
    socketRef.current = sock;
    sock.on('moon_rooms', (data: MoonRoom[]) => setRooms(data));
    sock.emit('moon_lobby');
    const poll = setInterval(() => sock.emit('moon_lobby'), 5000);
    return () => {
      clearInterval(poll);
      sock.disconnect();
    };
  }, []);

  // Refresh avatar + occupancy when returning from avatar editor / rooms
  useFocusEffect(
    useCallback(() => {
      socketRef.current?.emit('moon_lobby');
      fetchApi('/users/me')
        .then(res => (res.ok ? res.json() : null))
        .then(p => p?.avatarUrl && setAvatarUrl(p.avatarUrl))
        .catch(() => {});
    }, []),
  );

  const myAvatar =
    avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${user?.username || 'moon'}`;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <SessionHeaderActions
            navigation={navigation}
            session={{
              id: 'moonbase',
              label: 'MoonBase',
              icon: 'planet',
              gradient: GRADIENTS.sunset,
              route: { name: 'MoonBase' },
            }}
          />
          <Text style={TYPOGRAPHY.h2}>MoonBase 2.0</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Hero: your presence on the moon */}
        <LinearGradient colors={['#1B0E45', '#0A0618']} style={styles.hero}>
          <View style={styles.stars}>
            {[...Array(18)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.star,
                  {
                    left: `${(i * 53) % 100}%`,
                    top: `${(i * 31) % 90}%`,
                    opacity: 0.3 + ((i * 7) % 10) / 14,
                  },
                ]}
              />
            ))}
          </View>
          <Image source={{ uri: myAvatar }} style={styles.heroAvatar} />
          <Text style={styles.heroName}>{user?.displayName || user?.username || 'Moonwalker'}</Text>
          <Text style={styles.heroSub}>The legendary social world returns</Text>
          <TouchableOpacity
            style={styles.customizeBtn}
            onPress={() => navigation.navigate('MoonAvatar')}
          >
            <Ionicons name="color-wand" size={15} color="#FFF" />
            <Text style={styles.customizeText}>Customize avatar</Text>
          </TouchableOpacity>
        </LinearGradient>

        <Text style={styles.sectionLabel}>ROOMS</Text>
        <View style={styles.roomGrid}>
          {rooms.map(room => (
            <TouchableOpacity
              key={room.id}
              style={styles.roomCard}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate('MoonRoom', {
                  roomId: room.id,
                  roomName: room.name,
                  emoji: room.emoji,
                })
              }
            >
              <Text style={styles.roomEmoji}>{room.emoji}</Text>
              <Text style={styles.roomName}>{room.name}</Text>
              <Text style={styles.roomBlurb} numberOfLines={1}>{room.blurb}</Text>
              <View style={styles.occupancyRow}>
                <View style={[styles.presenceDot, room.occupancy > 0 && { backgroundColor: COLORS.success }]} />
                <Text style={styles.occupancyText}>
                  {room.occupancy > 0 ? `${room.occupancy} inside` : 'Be the first'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          {rooms.length === 0 && (
            <Text style={styles.loadingText}>Docking with MoonBase…</Text>
          )}
        </View>

        <Text style={styles.sectionLabel}>UPCOMING EVENTS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventsRow}>
          {EVENTS.map(e => (
            <View key={e.id} style={styles.eventCard}>
              <Ionicons name={e.icon as any} size={20} color={COLORS.gold} />
              <Text style={styles.eventTitle}>{e.title}</Text>
              <Text style={styles.eventWhen}>{e.when}</Text>
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0618' },
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
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)',
    padding: 22,
    alignItems: 'center',
    overflow: 'hidden',
  },
  stars: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  star: {
    position: 'absolute',
    width: 3, height: 3, borderRadius: 2,
    backgroundColor: '#FFF',
  },
  heroAvatar: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 2, borderColor: 'rgba(139,92,246,0.8)',
    backgroundColor: '#1B0E45',
  },
  heroName: { color: COLORS.text, fontSize: 18, fontWeight: '800', marginTop: 10 },
  heroSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  customizeBtn: {
    flexDirection: 'row', gap: 6,
    marginTop: 14,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingVertical: 9, paddingHorizontal: 18,
    alignItems: 'center',
  },
  customizeText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  sectionLabel: {
    ...TYPOGRAPHY.label, fontSize: 11,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl, marginBottom: SPACING.md,
  },
  roomGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    paddingHorizontal: SPACING.lg,
  },
  roomCard: {
    width: '48%',
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.glassBorder,
    padding: 14,
  },
  roomEmoji: { fontSize: 26 },
  roomName: { color: COLORS.text, fontWeight: '800', fontSize: 14, marginTop: 8 },
  roomBlurb: { color: COLORS.textMuted, fontSize: 11, marginTop: 3 },
  occupancyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  presenceDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: COLORS.surfaceElevated,
  },
  occupancyText: { color: COLORS.textMuted, fontSize: 11 },
  loadingText: { color: COLORS.textMuted, fontSize: 12, padding: SPACING.lg },
  eventsRow: { paddingHorizontal: SPACING.lg, gap: 10 },
  eventCard: {
    width: 170,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.glassBorder,
    padding: 14,
    gap: 6,
  },
  eventTitle: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
  eventWhen: { color: COLORS.textMuted, fontSize: 11 },
});
