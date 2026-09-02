import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Image,
  Modal, TextInput, FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import io, { Socket } from 'socket.io-client';
import {
  LudoGameDto, LUDO_MODES, LudoMode, SEAT_COLORS, getLegalMoves, getTeamOf,
} from '@mxit2/types';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL, fetchApi } from '../../utils/api';
import LudoBoard from '../../components/LudoBoard';
import { beep } from '../../utils/beep';
import GiftButton from '../../components/gifts/GiftButton';
import SessionHeaderActions from '../../components/SessionHeaderActions';

const BG = '#1E0A38';
const GOLD = '#F2C21F';
// Corner badges overlap ~30px past the board's own edge (see cornerTopLeft
// etc.) — the board area reserves this much padding on every side so that
// overlap never gets clipped by the screen edge.
const BOARD_AREA_PADDING = 32;


const REACTION_EMOJIS = ['👍', '😂', '😮', '😢', '🔥', '👏'];

// For the classic 4-corner board, which seat occupies which screen corner:
//   seat 3 → top-left   (Blue,  YARD_ORIGINS col 0-5 row 0-5)
//   seat 0 → top-right  (Red,   YARD_ORIGINS col 9-14 row 0-5)
//   seat 2 → bot-left   (Yellow,YARD_ORIGINS col 0-5 row 9-14)
//   seat 1 → bot-right  (Green, YARD_ORIGINS col 9-14 row 9-14)
const TOP_LEFT_SEAT  = 3;
const TOP_RIGHT_SEAT = 0;
const BOT_LEFT_SEAT  = 2;
const BOT_RIGHT_SEAT = 1;

// ── Player corner badge — pinned directly to the board's own corner (see
// `cornerPosition` below) rather than eating a whole row above/below the
// board, so the board itself can use nearly the full screen width instead
// of being squeezed down to fit alongside dedicated player rows. ─────────
function PlayerCorner({
  seatIndex, game, emptySeats, mySeat, myAvatarUrl, myDisplayName, style, bottomAnchored,
}: {
  seatIndex: number;
  game: LudoGameDto;
  emptySeats: number[];
  mySeat: number | null;
  myAvatarUrl?: string;
  myDisplayName?: string;
  style?: any;
  bottomAnchored?: boolean;
}) {
  const isEmpty   = emptySeats.includes(seatIndex);
  const seatData  = game.seats.find(s => s.seatIndex === seatIndex);
  const isTurn    = game.currentSeat === seatIndex && game.status === 'active';
  const isMe      = mySeat === seatIndex;
  const color     = SEAT_COLORS[seatIndex];

  if (isEmpty || !seatData) {
    return <View style={style} />;
  }

  const avatarNode = (
    <View style={[cs.avatar, { borderColor: color }, isTurn && cs.avatarTurn, isTurn && { shadowColor: color }]}>
      {isMe && myAvatarUrl ? (
        <Image source={{ uri: myAvatarUrl }} style={cs.avatarImg} />
      ) : (
        <Ionicons
          name={seatData.isAI ? 'hardware-chip-outline' : 'person'}
          size={19}
          color={color}
        />
      )}
      {isTurn && <View style={[cs.turnPip, { backgroundColor: color }]} />}
    </View>
  );
  const nameNode = (
    <Text style={cs.name} numberOfLines={1}>
      {isMe ? (myDisplayName || 'You') : (seatData.displayName || '—')}
    </Text>
  );

  // The avatar circle is always the element pinned exactly to the board's
  // corner point — for a bottom corner that means it must be the LAST child
  // (closest to the container's anchored bottom edge) instead of the first,
  // otherwise the name label between it and the anchor pushes the avatar's
  // true center away from the corner.
  return (
    <View style={[cs.corner, style]}>
      {bottomAnchored ? <>{nameNode}{avatarNode}</> : <>{avatarNode}{nameNode}</>}
    </View>
  );
}

// ── Dice / status zone (centre of bottom row) ────────────────────────────────
function DiceZone({
  game, mySeat, selectableTokenIndices, rolling, diceScale, onRoll,
}: {
  game: LudoGameDto;
  mySeat: number | null;
  selectableTokenIndices: number[];
  rolling: boolean;
  diceScale: Animated.Value;
  onRoll: () => void;
}) {
  const isMyTurn = mySeat !== null && game.currentSeat === mySeat && game.status === 'active';
  const color    = SEAT_COLORS[game.currentSeat];
  const current  = game.seats.find(s => s.seatIndex === game.currentSeat);

  if (game.status !== 'active') return null;

  if (isMyTurn && game.diceValue === null) {
    return (
      <View style={dz.root}>
        <TouchableOpacity onPress={onRoll} disabled={rolling} activeOpacity={0.85}>
          <Animated.View style={{ transform: [{ scale: diceScale }] }}>
            <View style={[dz.btn, { backgroundColor: color }]}>
              {rolling
                ? <ActivityIndicator color="#FFF" size="large" />
                : <Ionicons name="dice" size={36} color="#FFF" />}
            </View>
          </Animated.View>
        </TouchableOpacity>
        <Text style={dz.hint}>TAP TO ROLL</Text>
        {game.consecutiveSixes >= 2 && (
          <Text style={dz.warnText}>⚠️ One more 6 forfeits your turn</Text>
        )}
      </View>
    );
  }

  if (isMyTurn && game.diceValue !== null) {
    return (
      <View style={dz.root}>
        <View style={[dz.face, { borderColor: color }]}>
          <Text style={dz.faceNum}>{game.diceValue}</Text>
        </View>
        <Text style={dz.hint}>
          {selectableTokenIndices.length > 0 ? 'Tap a token' : 'No moves'}
        </Text>
        {game.diceValue === 6 && (
          <View style={dz.sixBadge}>
            <Text style={dz.sixBadgeText}>SIXES! Go again</Text>
          </View>
        )}
      </View>
    );
  }

  // Opponent's / AI turn
  return (
    <View style={dz.root}>
      <View style={[dz.btn, { backgroundColor: color, opacity: 0.45 }]}>
        <ActivityIndicator color="#FFF" />
      </View>
      <Text style={dz.hint} numberOfLines={1}>
        {current?.isAI ? 'Bot thinking…' : `${current?.displayName ?? '?'}'s turn`}
      </Text>
    </View>
  );
}

// ── A single reaction floating up from the dice zone and fading out ──────────
function FloatingReaction({ reactionKey, emoji }: { reactionKey: number; emoji: string }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 1400, useNativeDriver: true }).start();
  }, [reactionKey]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -70] });
  const opacity = anim.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] });
  const scale = anim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.5, 1.15, 1] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[fr.wrap, { opacity, transform: [{ translateY }, { scale }] }]}
    >
      <Text style={fr.emoji}>{emoji}</Text>
    </Animated.View>
  );
}

// ── A brief toast confirming an extra turn was granted (six rolled, a
// capture, or a token reaching home) — surfaces game logic that already
// runs server-side (ludo.service.ts's `extraTurn`) but was previously
// invisible to players.
function ExtraTurnToast({ toastKey, text }: { toastKey: number; text: string }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [toastKey]);

  const opacity = anim;
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] });

  return (
    <Animated.View pointerEvents="none" style={[et.wrap, { opacity, transform: [{ translateY }] }]}>
      <Text style={et.text}>{text}</Text>
    </Animated.View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function LudoGameScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { TYPOGRAPHY, GRADIENTS } = theme;
  const { gameId, mySeat: mySeatParam } = route.params;
  const ludoSession = {
    id: 'ludo',
    label: 'Ludo',
    icon: 'dice',
    gradient: GRADIENTS.sunset,
    route: {
      name: 'Main',
      params: { screen: 'Life', params: { screen: 'LudoGame', params: { gameId, mySeat: mySeatParam } } },
    },
  };
  const { user } = useAuth();
  const [game,          setGame]          = useState<LudoGameDto | null>(null);
  const [socket,        setSocket]        = useState<Socket | null>(null);
  const [rolling,       setRolling]       = useState(false);
  const [displayTokens, setDisplayTokens] = useState<number[][] | null>(null);
  const [boardAreaH,    setBoardAreaH]    = useState(0);
  const [showEmojiRow,  setShowEmojiRow]  = useState(false);
  const [showChat,      setShowChat]      = useState(false);
  const [chatText,      setChatText]      = useState('');
  const [chatMessages,  setChatMessages]  = useState<{ id: number; userId: string; displayName: string; text: string; isMe: boolean }[]>([]);
  const [unreadChat,    setUnreadChat]    = useState(0);
  const [reaction,      setReaction]      = useState<{ key: number; emoji: string } | null>(null);
  const [extraTurn,     setExtraTurn]     = useState<{ key: number; text: string } | null>(null);
  const diceScale      = useRef(new Animated.Value(1)).current;
  const prevTokensRef  = useRef<number[][] | null>(null);
  const prevGameRef    = useRef<LudoGameDto | null>(null);
  const hopTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatIdRef      = useRef(0);
  const reactionKeyRef = useRef(0);
  const extraTurnKeyRef = useRef(0);

  // ── Socket + REST setup ────────────────────────────────────────────────────
  useEffect(() => {
    fetchApi(`/ludo/${gameId}`)
      .then(r => r.json())
      .then((data: LudoGameDto) => { setGame(data); prevTokensRef.current = data.tokens; prevGameRef.current = data; })
      .catch(console.error);

    const sock = io(`${API_BASE_URL}/ludo`);
    setSocket(sock);
    sock.on('connect', () => sock.emit('join_game', { gameId }));

    sock.on('game_updated', (updated: LudoGameDto) => {
      setRolling(false);

      // A move just resolved (dice cleared) and the same seat kept the turn —
      // the extraTurn rule in ludo.service.ts (six rolled, a capture, or a
      // token reaching home) just fired server-side. That rule already ran on
      // every game; only the notice is new.
      const prevGame = prevGameRef.current;
      if (
        prevGame &&
        prevGame.diceValue !== null &&
        updated.diceValue === null &&
        updated.status === 'active' &&
        updated.currentSeat === prevGame.currentSeat
      ) {
        const seat = updated.seats.find(s => s.seatIndex === updated.currentSeat);
        const isMe = seat?.userId === user?.userId;
        extraTurnKeyRef.current += 1;
        setExtraTurn({
          key: extraTurnKeyRef.current,
          text: isMe ? '🎲 Extra turn — go again!' : `🎲 ${seat?.displayName ?? 'Opponent'} rolls again`,
        });
      }
      prevGameRef.current = updated;

      const prev = prevTokensRef.current;
      prevTokensRef.current = updated.tokens;

      if (!prev) { setGame(updated); return; }

      // Find the forward-moving token (captures jump to -1 — skip).
      let movedSeat = -1, movedIdx = -1, fromSteps = 0, toSteps = 0;
      outer: for (let s = 0; s < prev.length; s++) {
        for (let t = 0; t < (prev[s]?.length ?? 0); t++) {
          const oldV = prev[s][t], newV = updated.tokens[s]?.[t] ?? oldV;
          if (oldV !== newV && newV !== -1) {
            movedSeat = s; movedIdx = t; fromSteps = oldV; toSteps = newV;
            break outer;
          }
        }
      }

      setGame(updated);

      if (movedSeat < 0) { setDisplayTokens(null); return; }

      const startStep = fromSteps === -1 ? 0 : fromSteps + 1;
      const hops: number[] = [];
      for (let step = startStep; step <= toSteps; step++) hops.push(step);

      if (hops.length <= 1) { setDisplayTokens(null); return; }

      // Freeze the moved token at its old position; captures already applied.
      setDisplayTokens(updated.tokens.map((toks, s) =>
        s !== movedSeat ? [...toks] : toks.map((v, t) => (t === movedIdx ? fromSteps : v)),
      ));

      if (hopTimerRef.current) clearInterval(hopTimerRef.current);
      let hi = 0;
      hopTimerRef.current = setInterval(() => {
        const step = hops[hi++];
        setDisplayTokens(cur => {
          if (!cur) return null;
          const next = cur.map(s => [...s]);
          next[movedSeat][movedIdx] = step;
          return next;
        });
        if (hi >= hops.length) {
          clearInterval(hopTimerRef.current!);
          hopTimerRef.current = null;
          setDisplayTokens(null);
        }
      }, 170);
    });

    sock.on('invalid_action', () => setRolling(false));

    sock.on('emoji_received', (payload: { userId: string; emoji: string }) => {
      reactionKeyRef.current += 1;
      setReaction({ key: reactionKeyRef.current, emoji: payload.emoji });
    });

    sock.on('chat_received', (payload: { userId: string; displayName: string; text: string }) => {
      chatIdRef.current += 1;
      const isMe = payload.userId === user?.userId;
      setChatMessages(prev => [...prev, { id: chatIdRef.current, ...payload, isMe }]);
      if (!isMe) setUnreadChat(c => c + 1);
    });

    return () => { sock.disconnect(); if (hopTimerRef.current) clearInterval(hopTimerRef.current); };
  }, [gameId]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const mySeat = useMemo(() => {
    if (typeof mySeatParam === 'number') return mySeatParam;
    if (!game || !user) return null;
    const s = game.seats.find(s => s.userId === user.userId);
    return s ? s.seatIndex : null;
  }, [game, user, mySeatParam]);

  const mode = game ? LUDO_MODES[game.mode as LudoMode] : null;

  const selectableTokenIndices = useMemo(() => {
    if (!game || !mode || mySeat === null || game.currentSeat !== mySeat || game.diceValue === null) return [];
    return getLegalMoves(game.tokens, mySeat, mode.corners, game.diceValue, mode.teams).map(m => m.tokenIndex);
  }, [game, mode, mySeat]);

  const prevSelectRef = useRef(0);
  useEffect(() => {
    if (selectableTokenIndices.length > 0 && prevSelectRef.current === 0) beep();
    prevSelectRef.current = selectableTokenIndices.length;
  }, [selectableTokenIndices.length]);

  const emptySeats = useMemo(
    () => (game ? game.seats.filter(s => !s.isAI && !s.userId).map(s => s.seatIndex) : []),
    [game],
  );

  // The first human opponent seat — gifting targets a real player, never an AI.
  const giftRecipient = useMemo(() => {
    if (!game) return null;
    const opp = game.seats.find(s => !s.isAI && s.userId && s.seatIndex !== mySeat);
    return opp ? { id: opp.userId as string, name: opp.displayName || 'Player' } : null;
  }, [game, mySeat]);

  // boardSize is set by onLayout of the board container row (below).

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!game || !mode) {
    return (
      <SafeAreaView style={[s.root, s.centered]}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={[TYPOGRAPHY.body2, { marginTop: 14, color: 'rgba(255,255,255,0.6)' }]}>
          Loading game…
        </Text>
      </SafeAreaView>
    );
  }

  const myTeam = mySeat !== null ? getTeamOf(mySeat, mode.teams) : -1;
  const iWon   = game.status === 'finished' && game.winnerTeam === myTeam;

  const bounceDice = () => {
    diceScale.setValue(0.7);
    Animated.spring(diceScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  };

  const handleRoll = () => {
    if (!socket || !user || rolling) return;
    setRolling(true);
    bounceDice();
    socket.emit('roll_dice', { gameId, userId: user.userId });
  };

  const handleSelectToken = (tokenIndex: number) => {
    if (!socket || !user) return;
    socket.emit('move_token', { gameId, userId: user.userId, tokenIndex });
  };

  const sendReaction = (emoji: string) => {
    if (!socket || !user) return;
    setShowEmojiRow(false);
    // Optimistic — show it locally immediately rather than waiting on the
    // room echo, same as every other optimistic action in this codebase.
    reactionKeyRef.current += 1;
    setReaction({ key: reactionKeyRef.current, emoji });
    socket.emit('send_emoji', { gameId, userId: user.userId, emoji });
  };

  const openChat = () => {
    setShowChat(true);
    setUnreadChat(0);
  };

  const sendChatMessage = () => {
    const text = chatText.trim();
    if (!socket || !user || !text) return;
    setChatText('');
    socket.emit('send_chat', {
      gameId,
      userId: user.userId,
      displayName: user.displayName || user.username || 'Player',
      text,
    });
  };

  const isClassic = mode.corners === 4;

  // ── Classic 4-corner layout ────────────────────────────────────────────────
  if (isClassic) {
    const cornerProps = { game, emptySeats, mySeat, myAvatarUrl: user?.avatarUrl, myDisplayName: user?.displayName || user?.username };
    return (
      <SafeAreaView style={s.root} edges={['top', 'bottom']}>

        {/* SLIM TOP BAR — minimize/exit + mode label only; player badges now
            live on the board itself (below), not in a dedicated row here, so
            the board gets almost the entire screen instead of being squeezed
            between two player rows. */}
        <View style={s.slimTopBar}>
          <SessionHeaderActions navigation={navigation} session={ludoSession} />
          <View style={s.modeChip}>
            <Ionicons name="grid" size={12} color={GOLD} />
            <Text style={s.modeChipText}>{mode.label.toUpperCase()}</Text>
          </View>
          <View style={{ width: 32 }} />
        </View>

        {/* BOARD — sized to the smaller of the measured container's width and
            height (minus the padding reserved for corner-badge overlap) so a
            square board never overflows either axis (the container's height
            budget is usually taller than the screen is wide, so sizing off
            height alone pushed the board past both edges of the screen) and
            now fills nearly the whole screen instead of a small fraction of
            it. */}
        <View
          style={s.boardArea}
          onLayout={e => setBoardAreaH(Math.max(0, Math.min(e.nativeEvent.layout.width, e.nativeEvent.layout.height) - BOARD_AREA_PADDING * 2))}
        >
          {boardAreaH > 0 && (
            <View style={[s.boardWrap, { width: boardAreaH, height: boardAreaH }]}>
              <LudoBoard
                corners={mode.corners}
                tokens={displayTokens ?? game.tokens}
                currentSeat={game.currentSeat}
                mySeat={mySeat}
                selectableTokenIndices={selectableTokenIndices}
                hiddenSeats={emptySeats}
                onSelectToken={handleSelectToken}
              />
              {/* Player badges pinned to the board's own corners */}
              <PlayerCorner seatIndex={TOP_LEFT_SEAT} style={s.cornerTopLeft} {...cornerProps} />
              <PlayerCorner seatIndex={TOP_RIGHT_SEAT} style={s.cornerTopRight} {...cornerProps} />
              <PlayerCorner seatIndex={BOT_LEFT_SEAT} style={s.cornerBottomLeft} bottomAnchored {...cornerProps} />
              <PlayerCorner seatIndex={BOT_RIGHT_SEAT} style={s.cornerBottomRight} bottomAnchored {...cornerProps} />
            </View>
          )}
        </View>

        {/* DICE ZONE — centered below the board; no longer flanked by player
            corners since those moved onto the board itself. */}
        {extraTurn && <ExtraTurnToast toastKey={extraTurn.key} text={extraTurn.text} />}
        <View style={s.diceRow}>
          <DiceZone
            game={game}
            mySeat={mySeat}
            selectableTokenIndices={selectableTokenIndices}
            rolling={rolling}
            diceScale={diceScale}
            onRoll={handleRoll}
          />
        </View>

        {/* Reaction floating up from the dice zone */}
        {reaction && (
          <View style={s.reactionAnchor} pointerEvents="none">
            <FloatingReaction reactionKey={reaction.key} emoji={reaction.emoji} />
          </View>
        )}

        {/* Quick-reaction row — pops up above the action bar, real emoji
            actually sent to the other player, not a placeholder. */}
        {showEmojiRow && (
          <View style={s.emojiRow}>
            {REACTION_EMOJIS.map(e => (
              <TouchableOpacity key={e} style={s.emojiRowBtn} onPress={() => sendReaction(e)} activeOpacity={0.7}>
                <Text style={s.emojiRowText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ACTION BAR — real, working actions: quick reactions, chat with the
            other player, and (when there is one) gifting. Previously this
            row always showed EMOJI/CHAT buttons that just opened an Alert
            saying "coming soon" for every game, a permanent dead affordance. */}
        <View style={s.actionBar}>
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => setShowEmojiRow(v => !v)}
            activeOpacity={0.75}
          >
            <Ionicons name={showEmojiRow ? 'close-circle-outline' : 'happy-outline'} size={20} color="rgba(255,255,255,0.75)" />
            <Text style={s.actionBtnText}>EMOJI</Text>
          </TouchableOpacity>
          <View style={s.actionDivider} />
          <TouchableOpacity style={s.actionBtn} onPress={openChat} activeOpacity={0.75}>
            <View>
              <Ionicons name="chatbubble-outline" size={20} color="rgba(255,255,255,0.75)" />
              {unreadChat > 0 && (
                <View style={s.chatBadge}>
                  <Text style={s.chatBadgeText}>{unreadChat > 9 ? '9+' : unreadChat}</Text>
                </View>
              )}
            </View>
            <Text style={s.actionBtnText}>CHAT</Text>
          </TouchableOpacity>
          {giftRecipient && (
            <>
              <View style={s.actionDivider} />
              <View style={s.actionBtn}>
                <GiftButton
                  recipientId={giftRecipient.id}
                  recipientName={giftRecipient.name}
                  context="game"
                  contextId={gameId}
                  size={26}
                />
              </View>
            </>
          )}
        </View>

        {/* CHAT PANEL */}
        <Modal visible={showChat} transparent animationType="slide" onRequestClose={() => setShowChat(false)}>
          <KeyboardAvoidingView
            style={s.chatBackdrop}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <TouchableOpacity style={s.chatBackdropTap} activeOpacity={1} onPress={() => setShowChat(false)} />
            <View style={s.chatSheet}>
              <View style={s.chatSheetHeader}>
                <Text style={s.chatSheetTitle}>Game chat</Text>
                <TouchableOpacity onPress={() => setShowChat(false)} hitSlop={10}>
                  <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={chatMessages}
                keyExtractor={m => String(m.id)}
                style={s.chatList}
                contentContainerStyle={s.chatListContent}
                ListEmptyComponent={<Text style={s.chatEmpty}>Say hi 👋</Text>}
                renderItem={({ item }) => (
                  <View style={[s.chatBubbleRow, item.isMe && s.chatBubbleRowMe]}>
                    <View style={[s.chatBubble, item.isMe && s.chatBubbleMe]}>
                      {!item.isMe && <Text style={s.chatBubbleName}>{item.displayName}</Text>}
                      <Text style={s.chatBubbleText}>{item.text}</Text>
                    </View>
                  </View>
                )}
              />
              <View style={s.chatInputRow}>
                <TextInput
                  style={s.chatInput}
                  placeholder="Message…"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={chatText}
                  onChangeText={setChatText}
                  onSubmitEditing={sendChatMessage}
                  maxLength={200}
                />
                <TouchableOpacity style={s.chatSendBtn} onPress={sendChatMessage} disabled={!chatText.trim()}>
                  <Ionicons name="send" size={18} color={chatText.trim() ? GOLD : 'rgba(255,255,255,0.3)'} />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* GAME OVER OVERLAY */}
        {game.status === 'finished' && (
          <GameOverModal
            iWon={iWon}
            game={game}
            mode={mode}
            mySeat={mySeat}
            onLeave={() => navigation.goBack()}
          />
        )}
      </SafeAreaView>
    );
  }

  // ── Fallback layout for 6/8-corner star board ─────────────────────────────
  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.fallbackHeader}>
        <SessionHeaderActions navigation={navigation} session={ludoSession} />
        <Text style={s.fallbackTitle}>{mode.label}</Text>
        {giftRecipient ? (
          <GiftButton
            recipientId={giftRecipient.id}
            recipientName={giftRecipient.name}
            context="game"
            contextId={gameId}
            size={26}
          />
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <View style={s.boardArea}>
        <LudoBoard
          corners={mode.corners}
          tokens={displayTokens ?? game.tokens}
          currentSeat={game.currentSeat}
          mySeat={mySeat}
          selectableTokenIndices={selectableTokenIndices}
          hiddenSeats={emptySeats}
          onSelectToken={handleSelectToken}
        />
      </View>

      <View style={s.fallbackControls}>
        {extraTurn && <ExtraTurnToast toastKey={extraTurn.key} text={extraTurn.text} />}
        <DiceZone
          game={game}
          mySeat={mySeat}
          selectableTokenIndices={selectableTokenIndices}
          rolling={rolling}
          diceScale={diceScale}
          onRoll={handleRoll}
        />
      </View>

      {game.status === 'finished' && (
        <GameOverModal
          iWon={iWon}
          game={game}
          mode={mode}
          mySeat={mySeat}
          onLeave={() => navigation.goBack()}
        />
      )}
    </SafeAreaView>
  );
}

// ── Game over modal ──────────────────────────────────────────────────────────
function GameOverModal({ iWon, game, mode, mySeat, onLeave }: {
  iWon: boolean;
  game: LudoGameDto;
  mode: any;
  mySeat: number | null;
  onLeave: () => void;
}) {
  const ov = useThemedStyles(({ RADIUS }) => ({
    backdrop: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      justifyContent: 'center', alignItems: 'center',
    },
    card: {
      width: 300,
      borderRadius: RADIUS.xl,
      padding: 32,
      alignItems: 'center',
      gap: 14,
      borderWidth: 1,
      borderColor: 'rgba(242,194,31,0.3)',
    },
    emoji: { fontSize: 52 },
    title: { color: '#FFF', fontSize: 24, fontWeight: '800', textAlign: 'center' },
    winnerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    winnerDot: { width: 12, height: 12, borderRadius: 6 },
    winnerLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
    leaveBtn: {
      borderRadius: RADIUS.pill,
      paddingVertical: 12, paddingHorizontal: 32,
      marginTop: 4,
    },
    leaveBtnText: { color: '#1E0A38', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },
  }));

  return (
    <View style={ov.backdrop}>
      <LinearGradient
        colors={iWon ? ['#2D1155', '#4A0E8F'] : ['#1E0A38', '#2D0A5A']}
        style={ov.card}
      >
        {iWon ? (
          <>
            <Text style={ov.emoji}>🏆</Text>
            <Text style={ov.title}>You Won!</Text>
          </>
        ) : (
          <>
            <Text style={ov.emoji}>😔</Text>
            <Text style={ov.title}>Better Luck Next Time</Text>
          </>
        )}

        <View style={ov.winnerRow}>
          {(mode.teams[game.winnerTeam ?? 0] ?? []).map((seat: number) => (
            <View key={seat} style={[ov.winnerDot, { backgroundColor: SEAT_COLORS[seat] }]} />
          ))}
          <Text style={ov.winnerLabel}>
            {(mode.teams[game.winnerTeam ?? 0] ?? [])
              .map((seat: number) => seat === mySeat ? 'You' : game.seats.find(s => s.seatIndex === seat)?.displayName)
              .join(' & ')}
          </Text>
        </View>

        <TouchableOpacity onPress={onLeave} activeOpacity={0.85}>
          <LinearGradient colors={[GOLD, '#C49A0C']} style={ov.leaveBtn}>
            <Text style={ov.leaveBtnText}>Back to Lobby</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  centered:{ justifyContent: 'center', alignItems: 'center' },

  // 4-corner layout — a slim top bar (not a full player row) so almost all
  // vertical space goes to the board; player badges are pinned directly to
  // the board's own corners (cornerTopLeft etc. below) instead of eating a
  // dedicated row above and below it, which is what was squeezing the board
  // down before.
  slimTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 2,
    height: 44,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(242,194,31,0.25)',
  },
  modeChipText: { color: GOLD, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  backBtn: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center',
  },
  // Reserves a little breathing room on every side so the corner badges
  // (which overlap the board's edge) never get clipped by the screen edge.
  boardArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: BOARD_AREA_PADDING,
  },
  boardWrap: { position: 'relative' },
  // Offsets are chosen so the 44px AVATAR CIRCLE's center lands exactly on
  // the board's own corner point, not the badge container's edge — the
  // container is 60px wide (avatar centered, 8px margin each side) and 61px
  // tall (44px avatar + 3px gap + ~14px name label), so the vertical offset
  // that centers the avatar differs from the horizontal one. See
  // PlayerCorner's `bottomAnchored` prop: the avatar is always the child
  // adjacent to the anchored edge so this math holds for every corner.
  cornerTopLeft: { position: 'absolute', top: -22, left: -30, zIndex: 3 },
  cornerTopRight: { position: 'absolute', top: -22, right: -30, zIndex: 3 },
  cornerBottomLeft: { position: 'absolute', bottom: -22, left: -30, zIndex: 3 },
  cornerBottomRight: { position: 'absolute', bottom: -22, right: -30, zIndex: 3 },
  diceRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 8,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 8,
    minHeight: 56,
  },
  actionBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },
  actionBtnText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  actionDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginVertical: 6,
  },
  chatBadge: {
    position: 'absolute',
    top: -5, right: -8,
    minWidth: 15, height: 15,
    borderRadius: 8,
    backgroundColor: '#D8453C',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: BG,
  },
  chatBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },

  // Floating reaction
  reactionAnchor: {
    position: 'absolute',
    bottom: 130,
    left: 0, right: 0,
    alignItems: 'center',
    zIndex: 5,
  },

  // Quick-reaction popup row
  emojiRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 6,
    marginBottom: 6,
    padding: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(30,10,56,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(242,194,31,0.3)',
  },
  emojiRowBtn: {
    width: 38, height: 38,
    borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  emojiRowText: { fontSize: 20 },

  // Chat panel
  chatBackdrop: { flex: 1, justifyContent: 'flex-end' },
  chatBackdropTap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  chatSheet: {
    height: '62%',
    backgroundColor: '#241041',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(242,194,31,0.2)',
    overflow: 'hidden',
  },
  chatSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  chatSheetTitle: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  chatList: { flex: 1 },
  chatListContent: { padding: 14, gap: 8, flexGrow: 1 },
  chatEmpty: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 40, fontSize: 13 },
  chatBubbleRow: { flexDirection: 'row' },
  chatBubbleRowMe: { justifyContent: 'flex-end' },
  chatBubble: {
    maxWidth: '78%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chatBubbleMe: {
    backgroundColor: 'rgba(242,194,31,0.18)',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
  },
  chatBubbleName: { color: GOLD, fontSize: 11, fontWeight: '700', marginBottom: 2 },
  chatBubbleText: { color: '#FFF', fontSize: 14, lineHeight: 19 },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  chatInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#FFF',
    fontSize: 14,
  },
  chatSendBtn: {
    width: 38, height: 38,
    borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  // Fallback layout
  fallbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  fallbackTitle: { color: '#FFF', fontWeight: '700', fontSize: 18 },
  fallbackControls: { paddingVertical: 16, alignItems: 'center' },
});

// Player corner — sized as a small pinned badge (see cornerPosition in the
// main screen styles below), not a full row, so it can sit right on top of
// the board's own corner instead of budgeting a whole row of screen height.
const cs = StyleSheet.create({
  corner: { width: 60, alignItems: 'center', gap: 3 },
  avatar: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: BG,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowOpacity: 0.7,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  avatarTurn: { borderWidth: 3 },
  avatarImg: { width: '100%', height: '100%' },
  turnPip: {
    position: 'absolute',
    bottom: -2, right: -2,
    width: 12, height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: BG,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});

// Dice zone
const dz = StyleSheet.create({
  // No longer flex:1 — that was for sharing a row with two PlayerCorners;
  // the dice zone now sits alone in its own row and should size to content.
  root: { alignItems: 'center', gap: 6 },
  btn: {
    width: 68, height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  face: {
    width: 60, height: 60,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceNum: {
    color: '#FFF',
    fontSize: 30,
    fontWeight: '900',
  },
  hint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  sixBadge: {
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: 'rgba(242,194,31,0.18)',
    borderWidth: 1,
    borderColor: GOLD,
  },
  sixBadgeText: {
    color: GOLD,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  warnText: {
    color: '#FF9E5E',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
});

// Floating reaction emoji
const fr = StyleSheet.create({
  wrap: { alignItems: 'center' },
  emoji: { fontSize: 40 },
});

// Extra-turn toast
const et = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(242,194,31,0.95)',
    marginBottom: 6,
  },
  text: {
    color: '#1E0A38',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
