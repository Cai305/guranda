import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Image, Modal, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import * as api from '../../data/liveCategoryApi';
import { formatCurrency } from '../../utils/format';
import { registerLiveCategoryPanel, getLiveCategoryPanel } from './liveCategoryRegistry';
import './categories/rideLivePanel';

const panelStylesFactory = ({ COLORS, TYPOGRAPHY, RADIUS, SPACING }: any) => ({
  panel: {
    marginHorizontal: SPACING.lg, marginBottom: SPACING.lg,
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.md, padding: SPACING.md, gap: 8,
  },
  panelTitle: { ...TYPOGRAPHY.label, fontSize: 11 },
  hint: { color: COLORS.textMuted, fontSize: 12, lineHeight: 17 },
  errorText: { color: COLORS.error, fontSize: 12 },
  successText: { color: COLORS.success, fontSize: 12, fontWeight: '600' },
  itemName: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  itemPrice: { color: COLORS.secondary, fontSize: 14, fontWeight: '700' },
  input: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.glassBorder,
    paddingHorizontal: 12, paddingVertical: 10, color: COLORS.text, fontSize: 13,
  },
  actionBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center', flex: 1 },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  optionBtn: {
    borderWidth: 1, borderColor: COLORS.glassBorder, borderRadius: RADIUS.md,
    paddingVertical: 10, paddingHorizontal: 12, backgroundColor: COLORS.surface,
  },
  optionBtnActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}22` },
  optionText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  scoreText: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  scoreDivider: { color: COLORS.textMuted, fontSize: 16 },
  jobCard: { borderBottomWidth: 1, borderBottomColor: COLORS.glassBorder, paddingBottom: 8, marginBottom: 4 },
} as const);

const WATCHABLE_GAMES: Record<string, string> = { pool: 'PoolGame', ludo: 'LudoGame', chess: 'ChessGame' };

const shoppingCardStylesFactory = ({ COLORS, RADIUS, SPACING }: any) => ({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(18,18,26,0.88)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: RADIUS.lg, padding: 8,
  },
  thumb: { width: 46, height: 46, borderRadius: RADIUS.md },
  thumbPlaceholder: { backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  name: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  price: { color: COLORS.secondary, fontSize: 12.5, fontWeight: '700', marginTop: 1 },
  count: { color: 'rgba(255,255,255,0.6)', fontSize: 10.5, marginTop: 2 },
  shareBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.14)', justifyContent: 'center', alignItems: 'center' },
  buyBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, paddingHorizontal: 16, paddingVertical: 9 },
  buyBtnSmall: { backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 7 },
  buyBtnText: { color: '#FFF', fontWeight: '800', fontSize: 12.5 },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: SPACING.lg, paddingBottom: 32 },
  grabber: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.glassBorder, alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  sheetRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: RADIUS.md, padding: 8, marginBottom: 6,
    borderWidth: 1, borderColor: 'transparent',
  },
  sheetRowActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}18` },
  sheetThumb: { width: 44, height: 44, borderRadius: RADIUS.sm },
  addressLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 10, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.glassBorder,
    paddingHorizontal: 12, paddingVertical: 10, color: COLORS.text, fontSize: 13,
  },
  errorText: { color: COLORS.error, fontSize: 12, marginTop: 8 },
  successText: { color: COLORS.success, fontSize: 12, fontWeight: '600', marginTop: 8 },
} as const);

// Category-specific viewer interactions for Guranda Live. Every
// action here is a real backend call with real effects (real
// orders, real wallet debits/credits, real chats) — refreshed by
// `categoryEvent` from useLiveSocket so every viewer sees updates
// as they happen, not just the one who triggered them.
export default function LiveCategoryViewerPanel({
  categoryId, roomId, navigation, categoryEvent,
}: { categoryId: string; roomId: string; navigation: any; categoryEvent: { type: string; payload: any; nonce: number } | null }) {
  const [state, setState] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');

  const load = () => api.getRoomState(roomId).then(setState).catch(() => {});
  useEffect(() => { load(); }, [roomId]);
  useEffect(() => { if (categoryEvent) load(); }, [categoryEvent?.nonce]);

  const run = async (fn: () => Promise<any>, onDone?: (r: any) => void) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const r = await fn();
      onDone?.(r);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  if (!state) return null;

  // Every category's viewer interaction is registered below (or, for a
  // category like ride that lives entirely in its own file, in
  // categories/rideLivePanel.tsx) — adding a new live-capable mini-app
  // means registering a component here, not extending this function.
  const Viewer = getLiveCategoryPanel(categoryId)?.Viewer;
  if (!Viewer) return null;
  return (
    <Viewer
      roomId={roomId}
      state={state}
      navigation={navigation}
      run={run}
      error={error}
      success={success}
      setSuccess={setSuccess}
      busy={busy}
    />
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useThemedStyles(panelStylesFactory);
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{title}</Text>
      {children}
    </View>
  );
}
function ErrorText({ error }: { error: string }) {
  const styles = useThemedStyles(panelStylesFactory);
  return error ? <Text style={styles.errorText}>{error}</Text> : null;
}
function SuccessText({ text }: { text: string }) {
  const styles = useThemedStyles(panelStylesFactory);
  return text ? <Text style={styles.successText}>{text}</Text> : null;
}

// ── Live Shopping ────────────────────────────────────────────────────────
// Docked as its own floating card by LiveStreamPage (not the generic boxed
// Panel every other category uses) — the persistent, always-visible product
// slot TikTok Shop keeps above the comment feed. Tapping it opens the full
// shelf + shipping address in a bottom sheet; SPOTLIGHT vs SHELF (host-
// controlled style) only changes whether the card free-browses locally or
// follows the host's current pick.
function ShoppingViewer({ roomId, state, run, error, success, setSuccess, busy }: any) {
  const [address, setAddress] = useState('');
  const [previewIndex, setPreviewIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const { theme } = useTheme();
  const { COLORS } = theme;
  const styles = useThemedStyles(shoppingCardStylesFactory);
  const showcase = state.showcaseProducts || [];

  useEffect(() => { setPreviewIndex(state.spotlightIndex || 0); }, [state.spotlightIndex]);

  // Nothing to dock when the host hasn't featured anything yet — unlike
  // every other category's "check back soon" panel, showing an empty card
  // here would permanently occupy the product slot for no reason.
  if (showcase.length === 0) return null;

  const safeIndex = Math.min(previewIndex, showcase.length - 1);
  const current = showcase[safeIndex];

  const buy = (productId: string) => {
    if (!address.trim()) { setExpanded(true); return; }
    run(
      () => api.buyShowcaseProduct(roomId, productId, 1, address.trim()),
      () => setSuccess('Order placed! Check My Orders.'),
    );
  };

  const shareProduct = async () => {
    try {
      await Share.share({
        message: `Check out ${current.product?.name} — ${formatCurrency(current.product?.price)} — live now on Guranda!`,
      });
    } catch {
      // User dismissed the share sheet — nothing to surface.
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => setExpanded(true)}>
        {current.product?.imageUrl ? (
          <Image source={{ uri: current.product.imageUrl }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Ionicons name="bag-handle" size={20} color={COLORS.textMuted} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{current.product?.name}</Text>
          <Text style={styles.price}>{formatCurrency(current.product?.price)}</Text>
          {showcase.length > 1 && <Text style={styles.count}>{safeIndex + 1} of {showcase.length} · tap to browse</Text>}
        </View>
        <TouchableOpacity style={styles.shareBtn} onPress={shareProduct}>
          <Ionicons name="arrow-redo-outline" size={15} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.buyBtn} disabled={busy} onPress={() => buy(current.productId)}>
          {busy ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.buyBtnText}>Buy</Text>}
        </TouchableOpacity>
      </TouchableOpacity>

      <Modal visible={expanded} transparent animationType="slide" onRequestClose={() => setExpanded(false)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setExpanded(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.grabber} />
            <Text style={styles.sheetTitle}>{showcase.length > 1 ? `Shop this live · ${showcase.length} items` : 'Shop this live'}</Text>
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {showcase.map((s: any, i: number) => (
                <TouchableOpacity
                  key={s.productId}
                  style={[styles.sheetRow, i === safeIndex && styles.sheetRowActive]}
                  onPress={() => setPreviewIndex(i)}
                >
                  {s.product?.imageUrl ? (
                    <Image source={{ uri: s.product.imageUrl }} style={styles.sheetThumb} />
                  ) : (
                    <View style={[styles.sheetThumb, styles.thumbPlaceholder]}>
                      <Ionicons name="bag-handle" size={18} color={COLORS.textMuted} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>{s.product?.name}</Text>
                    <Text style={styles.price}>{formatCurrency(s.product?.price)}</Text>
                  </View>
                  <TouchableOpacity style={styles.buyBtnSmall} disabled={busy || !address.trim()} onPress={() => buy(s.productId)}>
                    <Text style={styles.buyBtnText}>Buy</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.addressLabel}>Shipping address</Text>
            <TextInput
              style={styles.input}
              placeholder="Where should this ship?"
              placeholderTextColor={COLORS.textMuted}
              value={address}
              onChangeText={setAddress}
            />
            {!!error && <Text style={styles.errorText}>{error}</Text>}
            {!!success && <Text style={styles.successText}>{success}</Text>}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ── Food Live ────────────────────────────────────────────────────────────
function FoodViewer({ roomId, state, run, error, success, setSuccess, busy }: any) {
  const [address, setAddress] = useState('');
  const { theme } = useTheme();
  const { COLORS } = theme;
  const styles = useThemedStyles(panelStylesFactory);
  const product = state.pinnedEatProduct;
  if (!product) return <Panel title="Food Live"><Text style={styles.hint}>Nothing pinned yet — check back soon.</Text></Panel>;

  return (
    <Panel title="Pinned menu item">
      <Text style={styles.itemName}>{product.name}</Text>
      <Text style={styles.itemPrice}>{formatCurrency(product.price)}</Text>
      <TextInput style={styles.input} placeholder="Delivery address" placeholderTextColor={COLORS.textMuted} value={address} onChangeText={setAddress} />
      <TouchableOpacity
        style={styles.actionBtn}
        disabled={busy || !address.trim()}
        onPress={() => run(() => api.orderPinnedFood(roomId, 1, address.trim()), () => setSuccess('Order placed! Check My Orders.'))}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Order Now</Text>}
      </TouchableOpacity>
      <ErrorText error={error} />
      <SuccessText text={success} />
    </Panel>
  );
}

// ── Gaming Live ──────────────────────────────────────────────────────────
function GamingViewer({ state, navigation }: any) {
  const styles = useThemedStyles(panelStylesFactory);
  if (!state.linkedGameType) return <Panel title="Gaming Live"><Text style={styles.hint}>No game linked right now.</Text></Panel>;
  const screen = WATCHABLE_GAMES[state.linkedGameType];
  return (
    <Panel title="Live game">
      <Text style={styles.itemName}>{state.linkedGameType.toUpperCase()} match in progress</Text>
      {screen ? (
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate(screen, { gameId: state.linkedGameId, mode: 'online' })}>
          <Text style={styles.actionBtnText}>Watch Game</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.hint}>Spectating this game type isn't supported yet.</Text>
      )}
    </Panel>
  );
}

// ── Business Live ────────────────────────────────────────────────────────
function BusinessViewer({ roomId, run, error, busy, navigation }: any) {
  const styles = useThemedStyles(panelStylesFactory);
  return (
    <Panel title="Networking">
      <TouchableOpacity
        style={styles.actionBtn}
        disabled={busy}
        onPress={() => run(() => api.connectWithHost(roomId), (chat: any) => navigation.navigate('Chat', { chatId: chat.id }))}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Connect with host</Text>}
      </TouchableOpacity>
      <ErrorText error={error} />
    </Panel>
  );
}

// ── Education Live ───────────────────────────────────────────────────────
function EducationViewer({ state, run, error, busy }: any) {
  const [answered, setAnswered] = useState(false);
  const styles = useThemedStyles(panelStylesFactory);
  const quiz = state.quizzes?.[0];
  if (!quiz) return <Panel title="Education Live"><Text style={styles.hint}>No quiz right now.</Text></Panel>;

  return (
    <Panel title={quiz.status === 'OPEN' ? 'Quiz time!' : 'Quiz resolved'}>
      <Text style={styles.itemName}>{quiz.question}</Text>
      {quiz.prizePool > 0 && <Text style={styles.hint}>Prize pool: {formatCurrency(quiz.prizePool)}</Text>}
      {quiz.status === 'OPEN' && !answered ? (
        quiz.options.map((opt: string, i: number) => (
          <TouchableOpacity
            key={i}
            style={styles.optionBtn}
            disabled={busy}
            onPress={() => run(() => api.answerQuiz(quiz.id, i), () => setAnswered(true))}
          >
            <Text style={styles.optionText}>{opt}</Text>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.hint}>{answered ? 'Answer submitted — wait for the host to resolve.' : 'This quiz has closed.'}</Text>
      )}
      <ErrorText error={error} />
    </Panel>
  );
}

// Shared by Entertainment Live and Dating Live's "Match or Pass?" vote.
function PollBlock({ poll, run, busy }: any) {
  const [voted, setVoted] = useState<number | null>(null);
  const styles = useThemedStyles(panelStylesFactory);
  if (!poll) return null;
  return (
    <>
      <Text style={styles.itemName}>{poll.question}</Text>
      {poll.options.map((opt: string, i: number) => (
        <TouchableOpacity
          key={i}
          style={[styles.optionBtn, voted === i && styles.optionBtnActive]}
          disabled={busy || voted !== null || poll.status !== 'OPEN'}
          onPress={() => run(() => api.votePoll(poll.id, i), () => setVoted(i))}
        >
          <Text style={styles.optionText}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </>
  );
}

// ── Entertainment Live ───────────────────────────────────────────────────
function EntertainmentViewer({ state, run, busy }: any) {
  const styles = useThemedStyles(panelStylesFactory);
  const poll = state.polls?.[0];
  if (!poll) return <Panel title="Entertainment Live"><Text style={styles.hint}>No poll right now.</Text></Panel>;

  return (
    <Panel title="Live poll">
      <PollBlock poll={poll} run={run} busy={busy} />
    </Panel>
  );
}

// ── Sports Live ──────────────────────────────────────────────────────────
function SportsViewer({ state, run, error, busy, success, setSuccess }: any) {
  const [amount, setAmount] = useState('');
  const { theme } = useTheme();
  const { COLORS } = theme;
  const styles = useThemedStyles(panelStylesFactory);
  const prediction = state.predictions?.[0];

  return (
    <Panel title="Scoreboard">
      {(state.scoreTeamA || state.scoreTeamB) ? (
        <View style={styles.scoreRow}>
          <Text style={styles.scoreText}>{state.scoreTeamA || 'Team A'} {state.scoreA}</Text>
          <Text style={styles.scoreDivider}>—</Text>
          <Text style={styles.scoreText}>{state.scoreB} {state.scoreTeamB || 'Team B'}</Text>
        </View>
      ) : (
        <Text style={styles.hint}>No scoreboard yet.</Text>
      )}
      {prediction && prediction.status === 'OPEN' && (
        <View style={{ marginTop: 10 }}>
          <Text style={styles.itemName}>{prediction.question}</Text>
          <TextInput style={styles.input} placeholder="Stake (R)" placeholderTextColor={COLORS.textMuted} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={styles.actionBtn}
              disabled={busy || !amount.trim()}
              onPress={() => run(() => api.placeBet(prediction.id, 'A', Number(amount)), () => setSuccess(`Bet placed on ${prediction.optionA}!`))}
            >
              <Text style={styles.actionBtnText}>{prediction.optionA}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              disabled={busy || !amount.trim()}
              onPress={() => run(() => api.placeBet(prediction.id, 'B', Number(amount)), () => setSuccess(`Bet placed on ${prediction.optionB}!`))}
            >
              <Text style={styles.actionBtnText}>{prediction.optionB}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <ErrorText error={error} />
      <SuccessText text={success} />
    </Panel>
  );
}

// ── Career Live ──────────────────────────────────────────────────────────
function CareerViewer({ state, run, error, success, setSuccess, busy }: any) {
  const [message, setMessage] = useState('');
  const { theme } = useTheme();
  const { COLORS } = theme;
  const styles = useThemedStyles(panelStylesFactory);
  const jobs = state.jobPostings || [];
  if (jobs.length === 0) return <Panel title="Career Live"><Text style={styles.hint}>No openings posted yet.</Text></Panel>;

  return (
    <Panel title="Openings">
      {jobs.map((job: any) => (
        <View key={job.id} style={styles.jobCard}>
          <Text style={styles.itemName}>{job.title}</Text>
          {job.salary ? <Text style={styles.hint}>{job.salary}</Text> : null}
          {job.description ? <Text style={styles.hint}>{job.description}</Text> : null}
        </View>
      ))}
      <TextInput style={styles.input} placeholder="Short message (optional)" placeholderTextColor={COLORS.textMuted} value={message} onChangeText={setMessage} />
      <TouchableOpacity
        style={styles.actionBtn}
        disabled={busy}
        onPress={() => run(() => api.applyToJob(jobs[0].id, message.trim()), () => setSuccess('Application sent!'))}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Apply to {jobs[0].title}</Text>}
      </TouchableOpacity>
      <ErrorText error={error} />
      <SuccessText text={success} />
    </Panel>
  );
}

// ── Social Live ──────────────────────────────────────────────────────────
function SocialViewer({ roomId, run, error, busy }: any) {
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const { theme } = useTheme();
  const { COLORS } = theme;
  const styles = useThemedStyles(panelStylesFactory);

  return (
    <Panel title="Ask a question">
      <TextInput style={styles.input} placeholder="Type your question…" placeholderTextColor={COLORS.textMuted} value={text} onChangeText={setText} />
      <TouchableOpacity
        style={styles.actionBtn}
        disabled={busy || !text.trim()}
        onPress={() => run(() => api.askQuestion(roomId, text.trim()), () => { setSent(true); setText(''); })}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Send</Text>}
      </TouchableOpacity>
      {sent && <Text style={styles.successText}>Question sent to the host!</Text>}
      <ErrorText error={error} />
    </Panel>
  );
}

// ── Conversation Live ────────────────────────────────────────────────────
function ConversationViewer({ state }: any) {
  const styles = useThemedStyles(panelStylesFactory);
  if (!state.conversationTopic) return <Panel title="Conversation Live"><Text style={styles.hint}>The host hasn't set a topic yet.</Text></Panel>;
  return (
    <Panel title="Right now, they're talking about">
      <Text style={styles.itemName}>{state.conversationTopic}</Text>
    </Panel>
  );
}

// ── Dating Live ──────────────────────────────────────────────────────────
function DatingViewer({ roomId, state, run, error, success, busy }: any) {
  const [bio, setBio] = useState('');
  const [applied, setApplied] = useState(false);
  const { theme } = useTheme();
  const { COLORS } = theme;
  const styles = useThemedStyles(panelStylesFactory);
  const a = state.featuredApplicantA;
  const b = state.featuredApplicantB;
  const poll = state.polls?.[0];

  const apply = () => run(() => api.applyDating(roomId, bio.trim()), () => setApplied(true));

  return (
    <Panel title={a && b ? 'Featured pair' : 'Dating Live'}>
      {a && b ? (
        <>
          <Text style={styles.itemName}>{a.user?.profile?.displayName || a.user?.username}</Text>
          <Text style={styles.hint}>{a.bio}</Text>
          <Text style={[styles.itemName, { marginTop: 6 }]}>{b.user?.profile?.displayName || b.user?.username}</Text>
          <Text style={styles.hint}>{b.bio}</Text>
          {poll && poll.status === 'OPEN' && (
            <View style={{ marginTop: 8 }}>
              <PollBlock poll={poll} run={run} busy={busy} />
            </View>
          )}
        </>
      ) : (
        <Text style={styles.hint}>No one's featured right now.</Text>
      )}
      <View style={{ marginTop: 10 }}>
        {applied ? (
          <Text style={styles.successText}>You're in the queue — the host may feature you soon.</Text>
        ) : (
          <>
            <Text style={styles.hint}>Want to be a contestant?</Text>
            <TextInput style={styles.input} placeholder="Tell us a little about you…" placeholderTextColor={COLORS.textMuted} value={bio} onChangeText={setBio} />
            <TouchableOpacity style={styles.actionBtn} disabled={busy || !bio.trim()} onPress={apply}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Apply</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
      <ErrorText error={error} />
      <SuccessText text={success} />
    </Panel>
  );
}

// ── Registration ─────────────────────────────────────────────────────────
// Every existing category's viewer component registers itself here — this
// is the "declare your own live config" step a new mini-app needs to do
// too (see categories/rideLivePanel.tsx for one that registers from its
// own file instead of living inline in this one).
registerLiveCategoryPanel('shopping', { Viewer: ShoppingViewer });
registerLiveCategoryPanel('food', { Viewer: FoodViewer });
registerLiveCategoryPanel('gaming', { Viewer: GamingViewer });
registerLiveCategoryPanel('business', { Viewer: BusinessViewer });
registerLiveCategoryPanel('education', { Viewer: EducationViewer });
registerLiveCategoryPanel('entertainment', { Viewer: EntertainmentViewer });
registerLiveCategoryPanel('sports', { Viewer: SportsViewer });
registerLiveCategoryPanel('career', { Viewer: CareerViewer });
registerLiveCategoryPanel('social', { Viewer: SocialViewer });
registerLiveCategoryPanel('conversation', { Viewer: ConversationViewer });
registerLiveCategoryPanel('dating', { Viewer: DatingViewer });


