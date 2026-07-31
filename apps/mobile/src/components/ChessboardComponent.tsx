import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Chess, Square, PieceSymbol, Color } from 'chess.js';

const PIECE_UNICODE: Record<Color, Record<PieceSymbol, string>> = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

const LIGHT_SQUARE = '#F0D9B5';
const DARK_SQUARE = '#B58863';
const SELECTED_SQUARE = 'rgba(255, 255, 0, 0.5)';
const LEGAL_MOVE_DOT = 'rgba(0, 0, 0, 0.25)';

interface ChessboardComponentProps {
  fen: string;
  onMove?: (move: { from: string; to: string }) => boolean | void;
  flipped?: boolean;
  disabled?: boolean;
}

export default function ChessboardComponent({
  fen,
  onMove,
  flipped = false,
  disabled = false,
}: ChessboardComponentProps) {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);

  const chess = new Chess(fen);
  const board = chess.board();

  const screenWidth = Dimensions.get('window').width;
  const boardSize = Math.min(screenWidth - 20, 400);
  const squareSize = boardSize / 8;

  const ranks = flipped ? [...RANKS].reverse() : RANKS;
  const files = flipped ? [...FILES].reverse() : FILES;

  const handleSquarePress = useCallback(
    (square: Square) => {
      if (disabled) return;

      if (selectedSquare) {
        // Attempt a move
        if (legalMoves.includes(square)) {
          const result = onMove?.({ from: selectedSquare, to: square });
          // If onMove returns false explicitly, do nothing
          if (result === false) {
            setSelectedSquare(null);
            setLegalMoves([]);
            return;
          }
        }
        // If clicking a different own piece, re-select
        const piece = chess.get(square);
        if (piece && piece.color === chess.turn()) {
          const moves = chess.moves({ square, verbose: true });
          setSelectedSquare(square);
          setLegalMoves(moves.map((m) => m.to as Square));
          return;
        }
        setSelectedSquare(null);
        setLegalMoves([]);
      } else {
        // Select a piece
        const piece = chess.get(square);
        if (piece && piece.color === chess.turn()) {
          const moves = chess.moves({ square, verbose: true });
          setSelectedSquare(square);
          setLegalMoves(moves.map((m) => m.to as Square));
        }
      }
    },
    [selectedSquare, legalMoves, fen, disabled, onMove],
  );

  return (
    <View style={[styles.board, { width: boardSize, height: boardSize }]}>
      {ranks.map((rank, rankIdx) => (
        <View key={rank} style={styles.row}>
          {files.map((file, fileIdx) => {
            const square = `${file}${rank}` as Square;
            const isLight = (rankIdx + fileIdx) % 2 === 0;
            const piece = board[RANKS.indexOf(rank)]?.[FILES.indexOf(file)];
            const isSelected = selectedSquare === square;
            const isLegalTarget = legalMoves.includes(square);

            return (
              <TouchableOpacity
                key={square}
                activeOpacity={0.7}
                onPress={() => handleSquarePress(square)}
                style={[
                  styles.square,
                  {
                    width: squareSize,
                    height: squareSize,
                    backgroundColor: isSelected
                      ? SELECTED_SQUARE
                      : isLight
                        ? LIGHT_SQUARE
                        : DARK_SQUARE,
                  },
                ]}
              >
                {piece && (
                  <Text
                    style={[
                      styles.piece,
                      { fontSize: squareSize * 0.7 },
                    ]}
                  >
                    {PIECE_UNICODE[piece.color][piece.type]}
                  </Text>
                )}
                {isLegalTarget && !piece && (
                  <View
                    style={[
                      styles.legalDot,
                      {
                        width: squareSize * 0.3,
                        height: squareSize * 0.3,
                        borderRadius: squareSize * 0.15,
                      },
                    ]}
                  />
                )}
                {isLegalTarget && piece && (
                  <View
                    style={[
                      styles.captureHighlight,
                      {
                        width: squareSize,
                        height: squareSize,
                        borderRadius: squareSize * 0.5,
                        borderWidth: squareSize * 0.08,
                      },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#5C3A1E',
  },
  row: {
    flexDirection: 'row',
  },
  square: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  piece: {
    textAlign: 'center',
    userSelect: 'none',
  } as any,
  legalDot: {
    backgroundColor: LEGAL_MOVE_DOT,
    position: 'absolute',
  },
  captureHighlight: {
    position: 'absolute',
    borderColor: LEGAL_MOVE_DOT,
    backgroundColor: 'transparent',
  },
});
