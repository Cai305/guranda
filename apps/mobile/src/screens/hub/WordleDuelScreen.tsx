import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import io, { Socket } from 'socket.io-client';
import { WordBattleGameDto, WordleStateDto, LetterState } from '@mxit2/types';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL, fetchApi } from '../../utils/api';
import GiftButton from '../../components/gifts/GiftButton';
import SessionHeaderActions from '../../components/SessionHeaderActions';

const KEY_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK'],
];

const STATE_COLOR: Record<LetterState, string> = {
  correct: '#16A34A',
  present: '#D97706',
  absent: '#3F3F46',
};
const STATE_RANK: Record<LetterState, number> = { absent: 0, present: 1, correct: 2 };

export default function WordleDuelScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS, GRADIENTS, TYPOGRAPHY } = theme;
  const { gameId, wager = 0 } = route.params || {};
  const { user } = useAuth();
  const [game, setGame] = useState<WordBattleGameDto | null>(null);
  const [current, setCurrent] = useState('');
  const [error, setError] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const settled = useRef(false);

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
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
    oppCard: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      marginHorizontal: SPACING.lg, backgroundColor: COLORS.glass,
      borderWidth: 1, borderColor: COLORS.glassBorder, borderRadius: RADIUS.md,
      padding: 10, marginBottom: SPACING.md,
    },
    oppText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
    grid: { alignItems: 'center', gap: 6, marginTop: 4 },
    gridRow: { flexDirection: 'row', gap: 6 },
    cell: {
      width: 46, height: 46, borderRadius: 8,
      borderWidth: 2, borderColor: COLORS.border,
      justifyContent: 'center', alignItems: 'center',
    },
    cellTyping: { borderColor: COLORS.textMuted },
    cellText: { color: COLORS.text, fontWeight: '800', fontSize: 22 },
    errorText: { color: COLORS.error, textAlign: 'center', marginTop: 10, fontSize: 13 },
    keyboard: { marginTop: 'auto', paddingHorizontal: 6, paddingBottom: 16, gap: 8 },
    keyRow: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
    key: {
      minWidth: 30, height: 46, paddingHorizontal: 8,
      backgroundColor: '#3F3F46', borderRadius: 6,
      justifyContent: 'center', alignItems: 'center',
    },
    keyWide: { minWidth: 50 },
    keyText: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
    waitingText: { color: COLORS.textMuted, textAlign: 'center', marginTop: 'auto', marginBottom: 20, fontSize: 13 },
    resultCard: {
      marginTop: SPACING.xl, marginHorizontal: SPACING.lg,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.lg, padding: 20, alignItems: 'center', gap: 6,
    },
    resultTitle: { color: COLORS.text, fontWeight: '800', fontSize: 20 },
    resultWord: { color: COLORS.textMuted, fontSize: 14 },
    resultWager: { color: COLORS.gold, fontWeight: '700', fontSize: 15, marginTop: 4 },
    backToLobbyBtn: {
      marginTop: 14, backgroundColor: COLORS.primary,
      borderRadius: RADIUS.pill, paddingVertical: 12, paddingHorizontal: 24,
    },
    backToLobbyText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  }));

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

  // Wager settlement once finished — must stay above any early return so
  // hook order never changes between renders.
  useEffect(() => {
    if (!game || game.status !== 'finished' || settled.current) return;
    settled.current = true;
    if (wager > 0 && game.winnerSeat === mySeat) {
      fetchApi('/word-battle/wager', { method: 'POST', body: JSON.stringify({ action: 'win', amount: wager }) }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.status]);

  if (!game) {
    return (
      <SafeAreaView style={styles.root}>
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const state = game.state as WordleStateDto;
  const oppSeat = 1 - mySeat;
  const opponent = game.seats[oppSeat];
  const wordLength = state.wordLength;
  const myGuesses = state.guesses.filter(g => g.seatIndex === mySeat);
  const oppGuesses = state.guesses.filter(g => g.seatIndex === oppSeat);
  const iAmFinished = state.finishedSeats.includes(mySeat);
  const finished = game.status === 'finished';

  const keyState: Record<string, LetterState> = {};
  for (const g of myGuesses) {
    g.word.split('').forEach((ch, i) => {
      const s = g.letters[i];
      if (!keyState[ch] || STATE_RANK[s] > STATE_RANK[keyState[ch]]) keyState[ch] = s;
    });
  }

  const typeKey = (key: string) => {
    if (iAmFinished || finished) return;
    setError('');
    if (key === 'BACK') { setCurrent(c => c.slice(0, -1)); return; }
    if (key === 'ENTER') {
      if (current.length !== wordLength) { setError(`Guess must be ${wordLength} letters`); return; }
      socketRef.current?.emit('wordle_guess', { gameId, userId: user?.userId, word: current });
      setCurrent('');
      return;
    }
    if (current.length < wordLength) setCurrent(c => c + key);
  };

  const rows = Array.from({ length: state.maxGuesses }, (_, r) => {
    if (r < myGuesses.length) return { word: myGuesses[r].word, letters: myGuesses[r].letters };
    if (r === myGuesses.length && !iAmFinished) return { word: '', letters: null, active: true };
    return { word: '', letters: null };
  });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <SessionHeaderActions
          navigation={navigation}
          session={{
            id: 'word-battle',
            label: 'Wordle Duel',
            icon: 'text',
            gradient: GRADIENTS.emerald,
            route: { name: 'Main', params: { screen: 'Life', params: { screen: 'WordleDuel', params: { gameId, wager } } } },
          }}
        />
        <Text style={TYPOGRAPHY.h2}>Wordle Duel</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.oppCard}>
        <Ionicons name={opponent.isAI ? 'hardware-chip' : 'person'} size={18} color={COLORS.textMuted} />
        <Text style={styles.oppText}>{opponent.displayName}</Text>
        {!opponent.isAI && opponent.userId && (
          <GiftButton
            recipientId={opponent.userId}
            recipientName={opponent.displayName}
            context="game"
            contextId={gameId}
            size={24}
            style={{ marginLeft: 8 }}
          />
        )}
        <View style={{ flex: 1 }} />
        <Text style={styles.oppText}>
          {oppGuesses.length}/{state.maxGuesses} guesses
          {state.finishedSeats.includes(oppSeat) ? (state.solvedSeats.includes(oppSeat) ? ' · Solved!' : ' · Out') : ''}
        </Text>
      </View>

      <View style={styles.grid}>
        {rows.map((row, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: wordLength }, (_, c) => {
              const letter = (row as any).active ? current[c] : row.word[c];
              const letterState = row.letters?.[c];
              return (
                <View
                  key={c}
                  style={[
                    styles.cell,
                    letterState && { backgroundColor: STATE_COLOR[letterState], borderColor: STATE_COLOR[letterState] },
                    (row as any).active && !!letter && styles.cellTyping,
                  ]}
                >
                  <Text style={styles.cellText}>{letter || ''}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {finished ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>
            {game.winnerSeat === null ? "It's a draw!" : game.winnerSeat === mySeat ? 'You won! 🎉' : `${opponent.displayName} won`}
          </Text>
          <Text style={styles.resultWord}>The word was {state.revealWord}</Text>
          {wager > 0 && (
            <Text style={styles.resultWager}>
              {game.winnerSeat === mySeat ? `+${wager * 2} MSH` : game.winnerSeat === null ? 'Wager refunded' : `-${wager} MSH`}
            </Text>
          )}
          <TouchableOpacity style={styles.backToLobbyBtn} onPress={() => navigation.navigate('WordBattleLobby')}>
            <Text style={styles.backToLobbyText}>Back to Lobby</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.keyboard}>
          {KEY_ROWS.map((row, i) => (
            <View key={i} style={styles.keyRow}>
              {row.map(key => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.key,
                    key.length > 1 && styles.keyWide,
                    keyState[key] && { backgroundColor: STATE_COLOR[keyState[key]] },
                  ]}
                  onPress={() => typeKey(key)}
                  disabled={iAmFinished}
                >
                  <Text style={styles.keyText}>{key === 'BACK' ? '⌫' : key}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      )}

      {iAmFinished && !finished && (
        <Text style={styles.waitingText}>Waiting for {opponent.displayName} to finish…</Text>
      )}
    </SafeAreaView>
  );
}
