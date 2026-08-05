import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL, fetchApi } from '../../utils/api';
import io, { Socket } from 'socket.io-client';
import { ChessGameDto } from '@mxit2/types';
import { Chess } from 'chess.js';
import ChessboardComponent from '../../components/ChessboardComponent';
import SessionHeaderActions from '../../components/SessionHeaderActions';

export default function ChessGameScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY, GRADIENTS } = theme;
  const { gameId } = route.params;
  const { user } = useAuth();
  const [game, setGame] = useState<ChessGameDto | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [localFen, setLocalFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

  // Rematch state
  const [rematchRequested, setRematchRequested] = useState(false);
  const [rematchRequestedByMe, setRematchRequestedByMe] = useState(false);
  const [rematchDeclined, setRematchDeclined] = useState(false);

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
    },
    gameContainer: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 10,
    },
    playerInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 15,
      backgroundColor: COLORS.surface,
      borderRadius: 12,
      marginVertical: 10,
    },
    playerDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    playerName: {
      ...TYPOGRAPHY.body1,
      fontWeight: 'bold',
    },
    timerBadge: {
      backgroundColor: COLORS.background,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    timerText: {
      ...TYPOGRAPHY.h3,
      fontVariant: ['tabular-nums'],
    },
    boardWrapper: {
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 20,
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modal: {
      backgroundColor: COLORS.surface,
      padding: 30,
      borderRadius: 20,
      alignItems: 'center',
      minWidth: 280,
    },
    rematchSection: {
      marginTop: 20,
      width: '100%',
      alignItems: 'center',
    },
    waitingRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rematchBtnRow: {
      flexDirection: 'row',
      gap: 12,
    },
    rematchBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: COLORS.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 999,
    },
    acceptBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: COLORS.success,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 999,
    },
    declineBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: COLORS.error,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 999,
    },
    btnText: {
      color: '#FFF',
      fontWeight: 'bold',
      fontSize: 14,
    },
    leaveBtn: {
      marginTop: 16,
      padding: 10,
    },
  }));

  useEffect(() => {
    // 1. Fetch initial state
    fetchApi(`/chess/${gameId}`)
      .then(res => res.json())
      .then(data => {
        setGame(data);
        setLocalFen(data.fen);
      })
      .catch(err => console.error(err));

    // 2. Connect to WS
    const newSocket = io(`${API_BASE_URL}/chess`);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join_game', { gameId });
    });

    newSocket.on('game_updated', (updatedGame: ChessGameDto) => {
      setGame(updatedGame);
      setLocalFen(updatedGame.fen);
    });

    newSocket.on('invalid_move', () => {
      Alert.alert('Invalid Move', 'That move was rejected by the server.');
      if (game) {
        setLocalFen(game.fen);
      }
    });

    newSocket.on('rematch_requested', (data: { requestedBy: string }) => {
      setRematchRequested(true);
      if (data.requestedBy === user?.userId) {
        setRematchRequestedByMe(true);
      }
    });

    newSocket.on('rematch_started', (data: { gameId: string }) => {
      // Navigate to the new game
      navigation.replace('ChessGame', { gameId: data.gameId });
    });

    newSocket.on('rematch_declined', () => {
      setRematchDeclined(true);
      setRematchRequested(false);
      setRematchRequestedByMe(false);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [gameId]);

  const handleMove = ({ from, to }: { from: string; to: string }) => {
    if (!socket || !user || !game) return false;

    try {
      const chess = new Chess(localFen);
      chess.move({ from, to, promotion: 'q' });
      setLocalFen(chess.fen());
    } catch {
      return false;
    }

    socket.emit('chess_move', {
      gameId,
      userId: user.userId,
      from,
      to,
      promotion: 'q',
    });

    return true;
  };

  const resign = () => {
    if (!socket || !user || !game) return;
    Alert.alert('Resign', 'Are you sure you want to resign?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resign',
        style: 'destructive',
        onPress: () => {
          socket.emit('resign_game', { gameId, userId: user.userId });
        },
      },
    ]);
  };

  const requestRematch = () => {
    if (!socket || !user) return;
    socket.emit('request_rematch', { gameId, userId: user.userId });
    setRematchRequestedByMe(true);
  };

  const acceptRematch = () => {
    if (!socket || !user) return;
    socket.emit('accept_rematch', { gameId, userId: user.userId });
  };

  const declineRematch = () => {
    if (!socket || !user) return;
    socket.emit('decline_rematch', { gameId, userId: user.userId });
    setRematchDeclined(true);
  };

  if (!game) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[TYPOGRAPHY.body1, { marginTop: 16 }]}>Loading game...</Text>
      </SafeAreaView>
    );
  }

  const isWhite = user?.userId === game.whiteId;
  const opponent = isWhite ? game.blackPlayer : game.whitePlayer;
  const myTime = isWhite ? game.whiteTime : game.blackTime;
  const oppTime = isWhite ? game.blackTime : game.whiteTime;

  const formatTime = (seconds: number) => {
    if (game.timeControl === 0) return '∞';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isGameOver = game.status !== 'active';

  // Determine result text
  const getResultText = () => {
    if (game.status === 'draw') return '½ - ½ Draw';
    const iWon =
      (game.status === 'white_won' && isWhite) ||
      (game.status === 'black_won' && !isWhite);
    return iWon ? '🎉 You Won!' : 'You Lost';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <SessionHeaderActions
          navigation={navigation}
          session={{
            id: 'chess',
            label: 'Chess',
            icon: 'grid',
            gradient: GRADIENTS.emerald,
            route: { name: 'Main', params: { screen: 'Life', params: { screen: 'ChessGame', params: { gameId } } } },
          }}
        />
        <Text style={TYPOGRAPHY.h3}>Chess</Text>
        <TouchableOpacity onPress={resign} disabled={isGameOver}>
          <Ionicons
            name="flag-outline"
            size={24}
            color={isGameOver ? COLORS.textMuted : COLORS.error}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.gameContainer}>
        {/* Opponent Info */}
        <View style={styles.playerInfo}>
          <View style={styles.playerDetails}>
            <Ionicons name="person-circle-outline" size={32} color={COLORS.textMuted} />
            <Text style={styles.playerName}>{opponent?.displayName || 'Opponent'}</Text>
          </View>
          <View style={styles.timerBadge}>
            <Text style={styles.timerText}>{formatTime(oppTime)}</Text>
          </View>
        </View>

        {/* Board */}
        <View style={styles.boardWrapper}>
          <ChessboardComponent
            fen={localFen}
            onMove={handleMove}
            flipped={!isWhite}
            disabled={isGameOver}
          />
        </View>

        {/* My Info */}
        <View style={styles.playerInfo}>
          <View style={styles.playerDetails}>
            <Ionicons name="person-circle" size={32} color={COLORS.primary} />
            <Text style={styles.playerName}>You</Text>
          </View>
          <View style={styles.timerBadge}>
            <Text style={styles.timerText}>{formatTime(myTime)}</Text>
          </View>
        </View>
      </View>

      {isGameOver && (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Ionicons
              name={getResultText().includes('Won') ? 'trophy' : getResultText().includes('Draw') ? 'hand-left' : 'sad'}
              size={48}
              color={getResultText().includes('Won') ? '#FFD700' : COLORS.textMuted}
            />
            <Text style={[TYPOGRAPHY.h2, { marginTop: 12 }]}>{getResultText()}</Text>
            <Text style={[TYPOGRAPHY.body2, { marginTop: 6 }]}>
              {game.status.replace(/_/g, ' ').toUpperCase()}
            </Text>

            {/* Rematch Section */}
            <View style={styles.rematchSection}>
              {rematchDeclined ? (
                <Text style={[TYPOGRAPHY.body2, { textAlign: 'center' }]}>
                  Rematch declined
                </Text>
              ) : rematchRequestedByMe ? (
                <View style={styles.waitingRow}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={[TYPOGRAPHY.body2, { marginLeft: 10 }]}>
                    Waiting for opponent...
                  </Text>
                </View>
              ) : rematchRequested ? (
                <View>
                  <Text style={[TYPOGRAPHY.body1, { textAlign: 'center', marginBottom: 12 }]}>
                    Opponent wants a rematch!
                  </Text>
                  <View style={styles.rematchBtnRow}>
                    <TouchableOpacity style={styles.acceptBtn} onPress={acceptRematch}>
                      <Ionicons name="checkmark" size={18} color="#FFF" />
                      <Text style={styles.btnText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.declineBtn} onPress={declineRematch}>
                      <Ionicons name="close" size={18} color="#FFF" />
                      <Text style={styles.btnText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.rematchBtn} onPress={requestRematch}>
                  <Ionicons name="refresh" size={18} color="#FFF" />
                  <Text style={styles.btnText}>Rematch</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={styles.leaveBtn} onPress={() => navigation.goBack()}>
              <Text style={{ color: COLORS.textMuted, fontWeight: '500' }}>Leave Game</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
