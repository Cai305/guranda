import type { LudoMode } from './ludoRules';
export * from './ludoRules';
export * from './morabarabaRules';
export * from './turboRacingRules';
export * from './fiveCardsRules';
export * from './cassinoRules';

export interface UserProfile {
  id: string;
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  statusMessage?: string;
}

export interface RegisterUserDto {
  username: string;
  phoneNumber?: string;
  passwordHash: string;
  isSelfCustodial: boolean;
  firstName: string;
  lastName: string;
  occupation: string;
}

export interface AuthResponse {
  user: UserProfile;
  token: string;
}

export interface WalletBalance {
  amount: number;
  currency: string;
}

// Denormalized snapshot of the message a reply points at — embedded directly
// on the replying message so the client can render the quoted snippet
// without a second fetch.
export interface ChatMessageReplyPreview {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  mediaUrl?: string;
}

export interface ChatMessageDto {
  id?: string;
  chatId: string;
  senderId: string;
  content: string;
  mediaUrl?: string;
  isAiGenerated?: boolean;
  isForwarded?: boolean;
  replyToId?: string;
  replyTo?: ChatMessageReplyPreview;
  createdAt?: Date;
}

// Guranda's custom hand-drawn emoji set ("Vemoji"), rendered as SVGs on
// device (see apps/mobile/src/components/live/CustomEmoji.tsx). A chat
// message carrying one is just its content string encoded with this prefix
// — no schema change needed, and it round-trips through the same
// ChatMessageDto.content field as regular text.
export type VemojiType = 'laugh' | 'cry' | 'fire' | 'clap' | 'love' | 'shocked' | 'blush' | 'inlove';

export interface VemojiDef {
  type: VemojiType;
  label: string;
  // Unicode fallback shown wherever the SVG can't render, e.g. push notification text.
  fallbackEmoji: string;
}

export const VEMOJI_CATALOG: VemojiDef[] = [
  { type: 'laugh', label: 'Haha', fallbackEmoji: '😂' },
  { type: 'cry', label: 'Crying', fallbackEmoji: '😢' },
  { type: 'fire', label: 'Fire', fallbackEmoji: '🔥' },
  { type: 'clap', label: 'Clap', fallbackEmoji: '👏' },
  { type: 'love', label: 'Love', fallbackEmoji: '❤️' },
  { type: 'shocked', label: 'Wow', fallbackEmoji: '😲' },
  { type: 'blush', label: 'Blush', fallbackEmoji: '😊' },
  { type: 'inlove', label: 'In love', fallbackEmoji: '😍' },
];

const VEMOJI_PREFIX = 'vemoji:';

export function encodeVemojiMessage(type: VemojiType): string {
  return `${VEMOJI_PREFIX}${type}`;
}

/** Returns the Vemoji type if `content` encodes one, otherwise null. */
export function parseVemojiMessage(content: string | null | undefined): VemojiType | null {
  if (!content || !content.startsWith(VEMOJI_PREFIX)) return null;
  const type = content.slice(VEMOJI_PREFIX.length);
  return (VEMOJI_CATALOG.some(v => v.type === type) ? type : null) as VemojiType | null;
}

export type UserStatus = 'online' | 'away' | 'busy' | 'offline';

export interface PresenceEvent {
  userId: string;
  status: UserStatus;
}

export interface PostDto {
  id: string;
  authorId: string;
  author?: UserProfile;
  content: string;
  mediaUrl?: string;
  mediaType?: 'IMAGE' | 'VIDEO';
  likes?: { id: string, userId: string }[];
  comments?: CommentDto[];
  createdAt: Date;
}

export interface CommentDto {
  id: string;
  postId: string;
  authorId: string;
  author?: UserProfile;
  content: string;
  createdAt: Date;
}

export interface CommunityDto {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  createdAt: Date;
  _count?: { members: number };
}

export interface CommunityDetailsDto extends CommunityDto {
  rooms: { id: string; name: string; type: string }[];
}

export interface StoryItemDto {
  id: string;
  storyId: string;
  name: string;
  brand?: string;
  price?: number;
  isForSale: boolean;
  sellerId?: string;
  buyerId?: string;
  soldAt?: Date;
  createdAt: Date;
}

export interface StoryLikeDto {
  id: string;
  storyId: string;
  userId: string;
  createdAt: Date;
}

export interface StoryCommentDto {
  id: string;
  storyId: string;
  userId: string;
  text: string;
  createdAt: Date;
}

export interface StoryRankDto {
  id: string;
  storyId: string;
  userId: string;
  value: number;
  createdAt: Date;
}

export interface Sticker {
  emoji: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface StoryDto {
  id: string;
  userId: string;
  author?: UserProfile;
  mediaUrl?: string;
  textContent?: string;
  backgroundColor?: string;
  musicUrl?: string;
  musicTitle?: string;
  stickers?: Sticker[];
  // null/undefined = general ephemeral story; set = a labeled "of the Day" post (e.g. "OOTD", "COTD")
  label?: string | null;
  createdAt: Date;
  expiresAt: Date;
  likes?: StoryLikeDto[];
  comments?: StoryCommentDto[];
  ranks?: StoryRankDto[];
  items?: StoryItemDto[];
}

export interface ChessGameDto {
  id: string;
  whiteId: string;
  blackId: string;
  whitePlayer?: UserProfile;
  blackPlayer?: UserProfile;
  pgn: string;
  fen: string;
  status: 'active' | 'draw' | 'white_won' | 'black_won';
  timeControl: number; // 0 for infinite, otherwise seconds
  whiteTime: number;
  blackTime: number;
  lastMoveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChessMovePayload {
  gameId: string;
  from: string;
  to: string;
  promotion?: string;
}

export interface ChessJoinQueuePayload {
  timeControl: number;
}

export interface LudoSeatDto {
  seatIndex: number;
  userId: string | null;
  isAI: boolean;
  displayName: string;
}

export interface LudoGameDto {
  id: string;
  mode: LudoMode;
  seats: LudoSeatDto[];
  tokens: number[][];
  currentSeat: number;
  diceValue: number | null;
  consecutiveSixes: number;
  status: 'active' | 'finished';
  winnerTeam: number | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LudoRollPayload {
  gameId: string;
  userId: string;
}

export interface LudoMovePayload {
  gameId: string;
  userId: string;
  tokenIndex: number;
}

export interface LudoJoinQueuePayload {
  mode: LudoMode;
  userId: string;
  displayName: string;
}

export interface LudoStartAIPayload {
  mode: LudoMode;
  userId: string;
  displayName: string;
  humanSeats?: number; // how many of the mode's seats the requesting user fills as extra "solo" testers; defaults to 1
}

// ============================================================
// Word Battle — Wordle Duel, Boggle, Scrabble. All three are
// 1v1, server-authoritative (dictionary + secrets live only on
// the API). Mobile only ever sees a per-seat-sanitized DTO.
// ============================================================

export type WordBattleMode = 'WORDLE' | 'BOGGLE' | 'SCRABBLE';
export type WordBattleDifficulty = 'easy' | 'medium' | 'hard';

export interface WordBattleSeatDto {
  seatIndex: number;
  userId: string | null;
  isAI: boolean;
  displayName: string;
}

// ---- Wordle Duel ----

export type LetterState = 'correct' | 'present' | 'absent';

export interface WordleGuessDto {
  seatIndex: number;
  word: string;
  letters: LetterState[];
}

export interface WordleStateDto {
  wordLength: number;
  maxGuesses: number;
  guesses: WordleGuessDto[];
  finishedSeats: number[]; // seats that solved or exhausted guesses
  solvedSeats: number[]; // seats that guessed correctly
  revealWord?: string; // only present once both seats are finished
}

// ---- Boggle ----

export interface BoggleFoundWordDto {
  seatIndex: number;
  word: string;
  points: number;
}

export interface BoggleStateDto {
  grid: string[]; // row-major, size*size letters ('QU' counts as one cell)
  size: number;
  durationSeconds: number;
  startedAt: string; // ISO timestamp
  scores: number[]; // per seat, running total
  wordCounts: number[]; // per seat, how many words found so far (words hidden until reveal)
  revealed?: BoggleFoundWordDto[]; // populated once time is up
}

// ---- Scrabble ----

export interface ScrabbleTileDto {
  letter: string; // '' for a placed blank
  value: number;
}

export interface ScrabbleBoardCellDto {
  tile: ScrabbleTileDto | null;
  premium: 'TW' | 'DW' | 'TL' | 'DL' | 'STAR' | null;
}

export interface ScrabbleMoveDto {
  seatIndex: number;
  wordsFormed: string[];
  points: number;
  passed?: boolean;
  exchanged?: boolean;
}

export interface ScrabbleStateDto {
  board: ScrabbleBoardCellDto[][]; // 15x15
  rack: ScrabbleTileDto[]; // only the requesting seat's own rack
  opponentRackCount: number;
  bagCount: number;
  scores: number[];
  currentSeat: number;
  lastMove: ScrabbleMoveDto | null;
  consecutivePasses: number;
  isFirstMove: boolean;
}

export type WordBattleAnyStateDto = WordleStateDto | BoggleStateDto | ScrabbleStateDto;

export interface WordBattleGameDto {
  id: string;
  mode: WordBattleMode;
  seats: WordBattleSeatDto[];
  state: WordBattleAnyStateDto;
  status: 'active' | 'finished';
  winnerSeat: number | null;
  wager: number;
  createdById: string;
}

export interface WordBattleJoinQueuePayload {
  mode: WordBattleMode;
  userId: string;
  displayName: string;
}

export interface WordBattleStartAIPayload {
  mode: WordBattleMode;
  userId: string;
  displayName: string;
  difficulty: WordBattleDifficulty;
}

export interface ScrabblePlacement {
  row: number;
  col: number;
  letter: string; // uppercase letter this tile represents (post-blank-assignment)
  fromRackIndex: number; // index into the player's rack of the tile used
}

// ============================================================
// Marketplace — buy, sell and auction anything, paid from the
// LifeOS wallet.
// ============================================================

export type ListingType = 'FIXED' | 'AUCTION';
export type ListingStatus = 'ACTIVE' | 'SOLD' | 'EXPIRED' | 'CANCELLED';
export type ItemCondition = 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR';

export interface MarketplaceBidDto {
  id: string;
  listingId: string;
  bidderId: string;
  bidder?: UserProfile & { username?: string };
  amount: number;
  createdAt: Date;
}

export interface MarketplaceListingDto {
  id: string;
  sellerId: string;
  seller?: { id: string; username: string; profile?: UserProfile };
  title: string;
  description?: string;
  category: string;
  condition: ItemCondition;
  images: string[];
  listingType: ListingType;
  price: number;
  status: ListingStatus;
  auctionEndsAt?: Date | null;
  currentBid?: number | null;
  currentBidderId?: string | null;
  buyerId?: string | null;
  soldAt?: Date | null;
  createdAt: Date;
  bids?: MarketplaceBidDto[];
}

