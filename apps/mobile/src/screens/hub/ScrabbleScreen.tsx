import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import io, { Socket } from 'socket.io-client';
import { WordBattleGameDto, ScrabbleStateDto, ScrabblePlacement } from '@mxit2/types';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL, fetchApi } from '../../utils/api';
import GiftButton from '../../components/gifts/GiftButton';
import SessionHeaderActions from '../../components/SessionHeaderActions';

const BOARD_SIZE = 15;
const CELL = 22;

const PREMIUM_BG: Record<string, string> = {
  TW: '#B91C1C',
  DW: '#DB2777',
  TL: '#1D4ED8',
  DL: '#0891B2',
  STAR: '#CA8A04',
};
const PREMIUM_LABEL: Record<string, string> = { TW: 'TW', DW: 'DW', TL: 'TL', DL: 'DL', STAR: '★' };

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function ScrabbleScreen({ navigation, route }: any) {
  const { gameId, wager = 0 } = route.params || {};
  const { user } = useAuth();
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY, GRADIENTS, SPACING } = theme;
  const styles = useThemedStyles(({ COLORS, SPACING, RADIUS }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: RADIUS.pill,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      justifyContent: 'center', alignItems: 'center',
    },
    scoreRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, marginBottom: 6,
    },
    scoreCard: {
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 6, alignItems: 'center',
    },
    scoreCardActive: { borderColor: COLORS.primary },
    scoreLabel: { color: COLORS.textMuted, fontSize: 10 },
    scoreValue: { color: COLORS.text, fontWeight: '800', fontSize: 16 },
    bagText: { color: COLORS.textMuted, fontSize: 11 },
    errorText: { color: COLORS.error, textAlign: 'center', fontSize: 12, marginBottom: 4 },
    turnText: { color: COLORS.textMuted, textAlign: 'center', fontSize: 12, marginBottom: 6 },
    board: { padding: 4 },
    boardRow: { flexDirection: 'row' },
    cell: {
      width: CELL, height: CELL,
      borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)',
      justifyContent: 'center', alignItems: 'center',
    },
    cellPending: { backgroundColor: 'rgba(139,92,246,0.5)' },
    tileLetter: { color: '#1A1200', fontWeight: '800', fontSize: 11, backgroundColor: '#FBBF24', width: '100%', height: '100%', textAlign: 'center', textAlignVertical: 'center' },
    tileLetterPending: { color: '#FFF', fontWeight: '800', fontSize: 12 },
    premiumText: { color: 'rgba(255,255,255,0.6)', fontSize: 7, fontWeight: '700' },
    rack: {
      flexDirection: 'row', gap: 6, justifyContent: 'center',
      paddingVertical: SPACING.md,
    },
    rackTile: {
      width: 38, height: 44, borderRadius: 6,
      backgroundColor: '#FBBF24',
      justifyContent: 'center', alignItems: 'center',
    },
    rackTileUsed: { opacity: 0.25 },
    rackTileSelected: { borderWidth: 3, borderColor: COLORS.primary },
    rackTileMarked: { borderWidth: 3, borderColor: COLORS.error },
    rackLetter: { color: '#1A1200', fontWeight: '800', fontSize: 18 },
    rackValue: { color: '#1A1200', fontWeight: '700', fontSize: 9, position: 'absolute', bottom: 2, right: 4 },
    actionRow: { flexDirection: 'row', gap: 8, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md },
    secondaryBtn: {
      flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.pill, paddingVertical: 12, alignItems: 'center',
    },
    secondaryText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 12 },
    primaryBtn: {
      flex: 1, backgroundColor: COLORS.primary,
      borderRadius: RADIUS.pill, paddingVertical: 12, alignItems: 'center',
    },
    primaryText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
    resultCard: {
      marginHorizontal: SPACING.lg, marginBottom: SPACING.lg,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.lg, padding: 20, alignItems: 'center', gap: 6,
    },
    resultTitle: { color: COLORS.text, fontWeight: '800', fontSize: 20 },
    resultSub: { color: COLORS.textMuted, fontSize: 14 },
    resultWager: { color: COLORS.gold, fontWeight: '700', fontSize: 15, marginTop: 4 },
    backToLobbyBtn: {
      marginTop: 14, backgroundColor: COLORS.primary,
      borderRadius: RADIUS.pill, paddingVertical: 12, paddingHorizontal: 24,
    },
    backToLobbyText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: SPACING.lg },
    modalCard: {
      backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder, padding: SPACING.lg,
    },
    modalTitle: { color: COLORS.text, fontWeight: '700', fontSize: 15, marginBottom: 12, textAlign: 'center' },
    alphabetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    alphabetKey: {
      width: 36, height: 36, borderRadius: 8,
      backgroundColor: 'rgba(255,255,255,0.08)',
      justifyContent: 'center', alignItems: 'center',
    },
    alphabetKeyText: { color: COLORS.text, fontWeight: '700' },
    modalCancel: { marginTop: 16, alignItems: 'center' },
  }));
  const [game, setGame] = useState<WordBattleGameDto | null>(null);
  const [selectedRackIndex, setSelectedRackIndex] = useState<number | null>(null);
  const [pending, setPending] = useState<ScrabblePlacement[]>([]);
  const [error, setError] = useState('');
  const [blankPickerFor, setBlankPickerFor] = useState<{ row: number; col: number } | null>(null);
  const [exchangeMode, setExchangeMode] = useState(false);
  const [exchangeIndices, setExchangeIndices] = useState<number[]>([]);
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
    sock.on('game_updated', (g: WordBattleGameDto) => {
      setGame(g);
      setPending([]);
      setSelectedRackIndex(null);
    });
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

  if (!game) {
    return (
      <SafeAreaView style={styles.root}>
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const state = game.state as ScrabbleStateDto;
  const oppSeat = 1 - mySeat;
  const opponent = game.seats[oppSeat];
  const finished = game.status === 'finished';
  const myTurn = state.currentSeat === mySeat && !finished;

  const rackUsed = (idx: number) => pending.some(p => p.fromRackIndex === idx);

  const placeAt = (row: number, col: number, letter: string) => {
    if (selectedRackIndex === null) return;
    setPending(prev => [...prev, { row, col, letter, fromRackIndex: selectedRackIndex }]);
    setSelectedRackIndex(null);
  };

  const tapCell = (row: number, col: number) => {
    if (!myTurn) return;
    setError('');
    const existingPending = pending.find(p => p.row === row && p.col === col);
    if (existingPending) {
      setPending(prev => prev.filter(p => !(p.row === row && p.col === col)));
      return;
    }
    if (state.board[row][col].tile) return; // occupied by an earlier turn
    if (selectedRackIndex === null) return;
    const tile = state.rack[selectedRackIndex];
    if (tile.letter === '') {
      setBlankPickerFor({ row, col });
      return;
    }
    placeAt(row, col, tile.letter);
  };

  const tapRackTile = (idx: number) => {
    if (rackUsed(idx)) return;
    if (exchangeMode) {
      setExchangeIndices(prev => (prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]));
      return;
    }
    if (!myTurn) return;
    setSelectedRackIndex(prev => (prev === idx ? null : idx));
  };

  const submitPlay = () => {
    if (pending.length === 0) { setError('Place at least one tile'); return; }
    socketRef.current?.emit('scrabble_place', { gameId, userId: user?.userId, placements: pending });
  };

  const pass = () => {
    socketRef.current?.emit('scrabble_pass', { gameId, userId: user?.userId });
  };

  const confirmExchange = () => {
    if (exchangeIndices.length === 0) { setExchangeMode(false); return; }
    socketRef.current?.emit('scrabble_exchange', { gameId, userId: user?.userId, rackIndices: exchangeIndices });
    setExchangeMode(false);
    setExchangeIndices([]);
  };

  const recallTiles = () => { setPending([]); setSelectedRackIndex(null); };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <SessionHeaderActions
          navigation={navigation}
          session={{
            id: 'word-battle',
            label: 'Scrabble',
            icon: 'text',
            gradient: GRADIENTS.emerald,
            route: { name: 'Main', params: { screen: 'Life', params: { screen: 'Scrabble', params: { gameId, wager } } } },
          }}
        />
        <Text style={TYPOGRAPHY.h2}>Scrabble</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.scoreRow}>
        <View style={[styles.scoreCard, myTurn && styles.scoreCardActive]}>
          <Text style={styles.scoreLabel}>You</Text>
          <Text style={styles.scoreValue}>{state.scores[mySeat]}</Text>
        </View>
        <Text style={styles.bagText}>Bag: {state.bagCount}</Text>
        <View style={[styles.scoreCard, !myTurn && !finished && styles.scoreCardActive]}>
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
        </View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!finished && (
        <Text style={styles.turnText}>{myTurn ? 'Your turn' : `Waiting for ${opponent.displayName}…`}</Text>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.md }}>
        <View style={styles.board}>
          {Array.from({ length: BOARD_SIZE }, (_, r) => (
            <View key={r} style={styles.boardRow}>
              {Array.from({ length: BOARD_SIZE }, (_, c) => {
                const cell = state.board[r][c];
                const pendingHere = pending.find(p => p.row === r && p.col === c);
                const isCenter = r === 7 && c === 7;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.cell,
                      cell.premium && { backgroundColor: PREMIUM_BG[cell.premium] + '55' },
                      pendingHere && styles.cellPending,
                    ]}
                    onPress={() => tapCell(r, c)}
                  >
                    {cell.tile ? (
                      <Text style={styles.tileLetter}>{cell.tile.letter}</Text>
                    ) : pendingHere ? (
                      <Text style={styles.tileLetterPending}>{pendingHere.letter}</Text>
                    ) : cell.premium ? (
                      <Text style={styles.premiumText}>{isCenter ? '★' : PREMIUM_LABEL[cell.premium]}</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.rack}>
        {state.rack.map((tile, idx) => {
          const used = rackUsed(idx);
          const selected = selectedRackIndex === idx;
          const markedForExchange = exchangeIndices.includes(idx);
          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.rackTile,
                used && styles.rackTileUsed,
                selected && styles.rackTileSelected,
                markedForExchange && styles.rackTileMarked,
              ]}
              onPress={() => tapRackTile(idx)}
              disabled={used}
            >
              <Text style={styles.rackLetter}>{tile.letter || '·'}</Text>
              {tile.value > 0 && <Text style={styles.rackValue}>{tile.value}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      {!finished && (
        <View style={styles.actionRow}>
          {exchangeMode ? (
            <>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => { setExchangeMode(false); setExchangeIndices([]); }}>
                <Text style={styles.secondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={confirmExchange} disabled={!myTurn}>
                <Text style={styles.primaryText}>Exchange {exchangeIndices.length} tile{exchangeIndices.length !== 1 ? 's' : ''}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.secondaryBtn} onPress={recallTiles} disabled={pending.length === 0}>
                <Text style={styles.secondaryText}>Recall</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setExchangeMode(true)} disabled={!myTurn}>
                <Text style={styles.secondaryText}>Exchange</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={pass} disabled={!myTurn}>
                <Text style={styles.secondaryText}>Pass</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={submitPlay} disabled={!myTurn || pending.length === 0}>
                <Text style={styles.primaryText}>Play</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {finished && (
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
          <TouchableOpacity style={styles.backToLobbyBtn} onPress={() => navigation.navigate('WordBattleLobby')}>
            <Text style={styles.backToLobbyText}>Back to Lobby</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={!!blankPickerFor} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Blank tile — choose a letter</Text>
            <View style={styles.alphabetGrid}>
              {ALPHABET.map(letter => (
                <TouchableOpacity
                  key={letter}
                  style={styles.alphabetKey}
                  onPress={() => {
                    if (blankPickerFor) placeAt(blankPickerFor.row, blankPickerFor.col, letter);
                    setBlankPickerFor(null);
                  }}
                >
                  <Text style={styles.alphabetKeyText}>{letter}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setBlankPickerFor(null)}>
              <Text style={styles.secondaryText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
