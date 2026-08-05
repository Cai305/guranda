import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import io, { Socket } from 'socket.io-client';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE_URL } from '../../../utils/api';
import SessionHeaderActions from '../../../components/SessionHeaderActions';

type Difficulty = 'easy' | 'medium' | 'hard';
const DIFFICULTIES: { key: Difficulty; label: string }[] = [
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
];

export default function FiveCardsLobbyScreen({ navigation }: any) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [jokersEnabled, setJokersEnabled] = useState(false);
  const [startingAI, setStartingAI] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const sock = io(`${API_BASE_URL}/cards`);
    setSocket(sock);

    sock.on('game_created', (data: { gameId: string }) => {
      setStartingAI(false);
      navigation.navigate('FiveCardsGame', { gameId: data.gameId });
    });
    sock.on('match_found', (data: { gameId: string }) => {
      setSearching(false);
      navigation.navigate('FiveCardsGame', { gameId: data.gameId });
    });

    return () => { sock.disconnect(); };
  }, [navigation]);

  const displayName = user?.displayName || user?.username || 'Player';
  const busy = startingAI || searching;

  const playVsAI = () => {
    if (!socket || !user || busy) return;
    setStartingAI(true);
    socket.emit('start_ai_game', {
      mode: 'FIVE_CARDS',
      userId: user.userId,
      displayName,
      difficulty,
      jokersEnabled,
    });
  };

  const findOnline = () => {
    if (!socket || !user || busy) return;
    setSearching(true);
    socket.emit('join_queue', { mode: 'FIVE_CARDS', userId: user.userId, displayName });
  };

  const cancelSearch = () => {
    socket?.emit('leave_queue');
    setSearching(false);
  };

  const playOffline = () => {
    navigation.navigate('FiveCardsGame', { offline: true, difficulty, jokersEnabled });
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <SessionHeaderActions
          navigation={navigation}
          session={{
            id: 'fivecards',
            label: '5 Cards',
            icon: 'albums',
            gradient: GRADIENTS.emerald,
            route: { name: 'Main', params: { screen: 'Life', params: { screen: 'FiveCardsLobby' } } },
          }}
        />
        <Text style={TYPOGRAPHY.h2}>5 Cards</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>AI Difficulty</Text>
        <View style={styles.chipRow}>
          {DIFFICULTIES.map((d) => (
            <TouchableOpacity
              key={d.key}
              style={[styles.chip, difficulty === d.key && styles.chipActive]}
              onPress={() => setDifficulty(d.key)}
            >
              <Text style={[styles.chipText, difficulty === d.key && styles.chipTextActive]}>{d.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.jokerRow}>
          <Text style={styles.jokerLabel}>Jokers wild</Text>
          <Switch value={jokersEnabled} onValueChange={setJokersEnabled} trackColor={{ true: COLORS.primary }} />
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={playVsAI} disabled={busy}>
          <LinearGradient colors={GRADIENTS.emerald} style={styles.primaryBtnGrad}>
            {startingAI ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="hardware-chip" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Play vs AI</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, searching && styles.secondaryBtnActive]}
          onPress={searching ? cancelSearch : findOnline}
          disabled={startingAI}
        >
          {searching ? (
            <>
              <ActivityIndicator color={COLORS.primary} size="small" />
              <Text style={styles.secondaryBtnText}>Searching… tap to cancel</Text>
            </>
          ) : (
            <>
              <Ionicons name="globe-outline" size={18} color={COLORS.primary} />
              <Text style={styles.secondaryBtnText}>Find Online Match</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.tertiaryBtn} onPress={() => navigation.navigate('CardsHome')}>
          <Ionicons name="people" size={16} color={COLORS.textMuted} />
          <Text style={styles.tertiaryBtnText}>Public & private rooms</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tertiaryBtn} onPress={playOffline}>
          <Ionicons name="airplane" size={16} color={COLORS.textMuted} />
          <Text style={styles.tertiaryBtnText}>Offline practice (no network)</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

