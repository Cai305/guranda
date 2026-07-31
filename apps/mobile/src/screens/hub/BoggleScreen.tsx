import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import io, { Socket } from 'socket.io-client';
import { WordBattleGameDto, BoggleStateDto } from '@mxit2/types';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, GRADIENTS } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL, fetchApi } from '../../utils/api';
import GiftButton from '../../components/gifts/GiftButton';
import SessionHeaderActions from '../../components/SessionHeaderActions';

const GRID_SIZE = 4;

function neighbors(index: number): number[] {
  const row = Math.floor(index / GRID_SIZE);
  const col = index % GRID_SIZE;
  const result: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr, nc = col + dc;
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) result.push(nr * GRID_SIZE + nc);
    }
  }
  return result;
}

export default function BoggleScreen({ navigation, route }: any) {
  const { gameId, wager = 0 } = route.params || {};
  const { user } = useAuth();
  const [game, setGame] = useState<WordBattleGameDto | null>(null);
  const [path, setPath] = useState<number[]>([]);
  const [myWords, setMyWords] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const settled = useRef(false);

  useEffect(() => {
    fetchApi(`/word-battle/${gameId}`)
      .then(res => (res.ok ? res.json() : null))
      .then(g => g && setGame(g))
      .catch(() => {});

    const sock = io(`${API_BASE_URL}/wordbattle`);
    socketRef.current = sock;
    sock.on('connect', () => sock.emit('join_game', { gameId, userId: user?.userId }));
    sock.on('game_updated', (g: WordBattleGameDto) => setGame(g));
    sock.on('invalid_action', (d: { reason: string }) => setError(d.reason));

    if (wager > 0) {
      fetchApi('/word-battle/wager', { method: 'POST', body: JSON.stringify({ action: 'stake', amount: wager }) }).catch(() => {});
    }

    return () => { sock.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  const mySeat = game ? game.seats.findIndex(s => s.userId === user?.userId) : -1;

  useEffect(() => {
    if (!game || game.status !== 'finished' || settled.current) return;
    settled.current = true;
    if (wager > 0 && game.winnerSeat === mySeat) {
      fetchApi('/word-battle/wager', { method: 'POST', body: JSON.stringify({ action: 'win', amount: wager }) }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.status]);

  useEffect(() => {
    if (!game) return;
    const state = game.state as BoggleStateDto;
    const startedMs = new Date(state.startedAt).getTime();
    const tick = () => {
      const left = Math.max(0, state.durationSeconds - Math.floor((Date.now() - startedMs) / 1000));
      setRemaining(left);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [game]);

  if (!game) {
    return (
      <SafeAreaView style={styles.root}>
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const state = game.state as BoggleStateDto;
  const oppSeat = 1 - mySeat;
  const opponent = game.seats[oppSeat];
  const finished = game.status === 'finished';
  const currentWord = path.map(i => state.grid[i]).join('');

  const tapCell = (index: number) => {
    if (finished) return;
    setError('');
    if (path.includes(index)) {
      // tapping the last cell again submits early via Clear instead; tapping
      // an earlier cell in the path trims back to that point
      const pos = path.indexOf(index);
      setPath(path.slice(0, pos + 1));
      return;
    }
    if (path.length === 0) { setPath([index]); return; }
    const last = path[path.length - 1];
    if (neighbors(last).includes(index)) setPath([...path, index]);
  };

  const submit = () => {
    if (currentWord.length < 3) { setError('Words must be at least 3 letters'); return; }
    socketRef.current?.emit('boggle_submit', { gameId, userId: user?.userId, word: currentWord });
    setMyWords(prev => [...prev, currentWord]);
    setPath([]);
  };

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <SessionHeaderActions
          navigation={navigation}
          session={{
            id: 'word-battle',
            label: 'Boggle',
            icon: 'text',
            gradient: GRADIENTS.emerald,
            route: { name: 'Main', params: { screen: 'Life', params: { screen: 'Boggle', params: { gameId, wager } } } },
          }}
        />
        <Text style={TYPOGRAPHY.h2}>Boggle</Text>
        <View style={styles.timerPill}>
          <Ionicons name="time-outline" size={14} color={remaining < 15 ? COLORS.error : COLORS.text} />
          <Text style={[styles.timerText, remaining < 15 && { color: COLORS.error }]}>
            {minutes}:{seconds.toString().padStart(2, '0')}
          </Text>
        </View>
      </View>

      <View style={styles.scoreRow}>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>You</Text>
          <Text style={styles.scoreValue}>{state.scores[mySeat]}</Text>
          <Text style={styles.scoreSub}>{state.wordCounts[mySeat]} words</Text>
        </View>
        <View style={styles.scoreCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.scoreLabel}>{opponent.displayName}</Text>
            {!opponent.isAI && opponent.userId && (
              <GiftButton
                recipientId={opponent.userId}
                recipientName={opponent.displayName}
                context="game"
                contextId={gameId}
                size={22}
              />
            )}
          </View>
          <Text style={styles.scoreValue}>{state.scores[oppSeat]}</Text>
          <Text style={styles.scoreSub}>{state.wordCounts[oppSeat]} words</Text>
        </View>
      </View>

      <View style={styles.wordPreview}>
        <Text style={styles.wordPreviewText}>{currentWord || 'Trace a word…'}</Text>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.grid}>
        {Array.from({ length: GRID_SIZE }, (_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: GRID_SIZE }, (_, c) => {
              const idx = r * GRID_SIZE + c;
              const selected = path.includes(idx);
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.cell, selected && styles.cellSelected]}
                  onPress={() => tapCell(idx)}
                  disabled={finished}
                >
                  <Text style={[styles.cellText, selected && { color: '#FFF' }]}>{state.grid[idx]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.clearBtn} onPress={() => setPath([])} disabled={finished || path.length === 0}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={finished || currentWord.length < 3}>
          <Text style={styles.submitText}>Submit</Text>
        </TouchableOpacity>
      </View>

      {myWords.length > 0 && !finished && (
        <Text style={styles.myWordsText}>Found: {myWords.join(', ')}</Text>
      )}

      {finished && (
        <ScrollView style={styles.resultScroll}>
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>
              {game.winnerSeat === null ? "It's a draw!" : game.winnerSeat === mySeat ? 'You won! 🎉' : `${opponent.displayName} won`}
            </Text>
            <Text style={styles.resultSub}>{state.scores[mySeat]} — {state.scores[oppSeat]}</Text>
            {wager > 0 && (
              <Text style={styles.resultWager}>
                {game.winnerSeat === mySeat ? `+${wager * 2} MSH` : game.winnerSeat === null ? 'Wager refunded' : `-${wager} MSH`}
              </Text>
            )}
            <View style={styles.revealList}>
              {(state.revealed ?? []).map((w, i) => (
                <Text key={i} style={[styles.revealWord, w.points === 0 && styles.revealCancelled]}>
                  {w.word} {w.points === 0 ? '(cancelled — both found it)' : `+${w.points}`} · {game.seats[w.seatIndex].displayName}
                </Text>
              ))}
            </View>
            <TouchableOpacity style={styles.backToLobbyBtn} onPress={() => navigation.navigate('WordBattleLobby')}>
              <Text style={styles.backToLobbyText}>Back to Lobby</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  timerPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 6,
  },
  timerText: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
  scoreRow: { flexDirection: 'row', gap: 10, paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  scoreCard: {
    flex: 1, backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.md, padding: 10, alignItems: 'center',
  },
  scoreLabel: { color: COLORS.textMuted, fontSize: 11 },
  scoreValue: { color: COLORS.text, fontWeight: '800', fontSize: 22, marginTop: 2 },
  scoreSub: { color: COLORS.textMuted, fontSize: 10 },
  wordPreview: {
    marginHorizontal: SPACING.lg, alignItems: 'center', paddingVertical: 8,
  },
  wordPreviewText: { color: COLORS.text, fontWeight: '800', fontSize: 22, letterSpacing: 2 },
  errorText: { color: COLORS.error, textAlign: 'center', fontSize: 12, marginBottom: 4 },
  grid: { alignItems: 'center', gap: 8, marginTop: 4 },
  gridRow: { flexDirection: 'row', gap: 8 },
  cell: {
    width: 66, height: 66, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: COLORS.glassBorder,
    justifyContent: 'center', alignItems: 'center',
  },
  cellSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  cellText: { color: COLORS.text, fontWeight: '800', fontSize: 24 },
  actionRow: { flexDirection: 'row', gap: 10, paddingHorizontal: SPACING.lg, marginTop: SPACING.lg },
  clearBtn: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.pill, paddingVertical: 12, alignItems: 'center',
  },
  clearText: { color: COLORS.textMuted, fontWeight: '700' },
  submitBtn: {
    flex: 2, backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill, paddingVertical: 12, alignItems: 'center',
  },
  submitText: { color: '#FFF', fontWeight: '800' },
  myWordsText: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', marginTop: 12, paddingHorizontal: SPACING.lg },
  resultScroll: { flex: 1, marginTop: SPACING.md },
  resultCard: {
    marginHorizontal: SPACING.lg, backgroundColor: COLORS.glass,
    borderWidth: 1, borderColor: COLORS.glassBorder, borderRadius: RADIUS.lg,
    padding: 20, alignItems: 'center', gap: 6,
  },
  resultTitle: { color: COLORS.text, fontWeight: '800', fontSize: 20 },
  resultSub: { color: COLORS.textMuted, fontSize: 14 },
  resultWager: { color: COLORS.gold, fontWeight: '700', fontSize: 15, marginTop: 4 },
  revealList: { marginTop: 12, gap: 4, alignSelf: 'stretch' },
  revealWord: { color: COLORS.text, fontSize: 12.5 },
  revealCancelled: { color: COLORS.textMuted, textDecorationLine: 'line-through' },
  backToLobbyBtn: {
    marginTop: 14, backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill, paddingVertical: 12, paddingHorizontal: 24,
  },
  backToLobbyText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
