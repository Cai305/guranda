import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import * as api from '../../data/liveCategoryApi';

const GAME_TYPES = [
  { id: 'pool', label: 'Pool', icon: 'radio-button-on' },
  { id: 'ludo', label: 'Ludo', icon: 'dice' },
  { id: 'chess', label: 'Chess', icon: 'grid' },
  { id: 'murabaraba', label: 'Murabaraba', icon: 'apps' },
  { id: 'wordbattle', label: 'Word Battle', icon: 'text' },
];

// Shared styles for this file's panel + host sub-components. Every
// sub-component below calls this hook independently (hooks can't be
// shared across components), so each gets its own live-themed StyleSheet.
function useHostPanelStyles() {
  return useThemedStyles(({ COLORS, TYPOGRAPHY, RADIUS, SPACING }) => ({
    panel: {
      marginHorizontal: SPACING.lg, marginTop: SPACING.lg,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md, padding: SPACING.md, gap: 8,
    },
    panelTitle: { ...TYPOGRAPHY.label, fontSize: 11 },
    hint: { color: COLORS.textMuted, fontSize: 12, lineHeight: 17 },
    errorText: { color: COLORS.error, fontSize: 12 },
    successText: { color: COLORS.success, fontSize: 12, fontWeight: '600' },
    linkText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.pill,
      backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.glassBorder,
    },
    chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
    chipTextActive: { color: '#fff' },
    input: {
      backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.glassBorder,
      paddingHorizontal: 12, paddingVertical: 10, color: COLORS.text, fontSize: 13,
    },
    actionBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center' },
    actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: COLORS.glassBorder },
    radioActive: { backgroundColor: COLORS.success, borderColor: COLORS.success },
    scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
    scoreSide: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    scoreBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    scoreNum: { color: COLORS.text, fontSize: 22, fontWeight: '800', minWidth: 30, textAlign: 'center' },
    scoreDivider: { color: COLORS.textMuted, fontSize: 18 },
    divider: { height: 1, backgroundColor: COLORS.glassBorder, marginVertical: 8 },
    applicantRow: { paddingVertical: 6, borderTopWidth: 1, borderTopColor: COLORS.glassBorder },
    applicantName: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
    questionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: COLORS.glassBorder, gap: 8 },
  }));
}

// Category-specific host controls for Guranda Live. Rendered only for
// real rooms (a roomId from the backend) — every action here hits a
// real endpoint (live.controller.ts) with real, verified effects
// (real orders, real wallet debits/credits, real chats).
export default function LiveCategoryHostPanel({ categoryId, roomId }: { categoryId: string; roomId: string }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<any>, onDone?: (r: any) => void) => {
    setBusy(true);
    setError('');
    try {
      const r = await fn();
      onDone?.(r);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  if (categoryId === 'shopping') return <ShoppingHost roomId={roomId} run={run} error={error} busy={busy} />;
  if (categoryId === 'food') return <FoodHost roomId={roomId} run={run} error={error} busy={busy} />;
  if (categoryId === 'gaming') return <GamingHost roomId={roomId} run={run} error={error} busy={busy} />;
  if (categoryId === 'business') return <BusinessHost />;
  if (categoryId === 'education') return <EducationHost roomId={roomId} run={run} error={error} busy={busy} />;
  if (categoryId === 'entertainment') return <EntertainmentHost roomId={roomId} run={run} error={error} busy={busy} />;
  if (categoryId === 'sports') return <SportsHost roomId={roomId} run={run} error={error} busy={busy} />;
  if (categoryId === 'career') return <CareerHost roomId={roomId} run={run} error={error} busy={busy} />;
  if (categoryId === 'social') return <SocialHost roomId={roomId} />;
  return null;
}

type RunFn = (fn: () => Promise<any>, onDone?: (r: any) => void) => void;

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useHostPanelStyles();
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ErrorText({ error }: { error: string }) {
  const styles = useHostPanelStyles();
  if (!error) return null;
  return <Text style={styles.errorText}>{error}</Text>;
}

// ── Live Shopping ────────────────────────────────────────────────────────
function ShoppingHost({ roomId, run, error, busy }: { roomId: string; run: RunFn; error: string; busy: boolean }) {
  const [products, setProducts] = useState<any[]>([]);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const styles = useHostPanelStyles();

  useEffect(() => { api.getMyShoppingStore().then(s => setProducts(s?.products || [])).catch(() => {}); }, []);

  return (
    <Panel title="Pin a product">
      {products.length === 0 ? (
        <Text style={styles.hint}>You don't have any products yet — add some in My Shop first.</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {products.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[styles.chip, pinnedId === p.id && styles.chipActive]}
              onPress={() => run(() => api.pinShoppingProduct(roomId, p.id), () => setPinnedId(p.id))}
              disabled={busy}
            >
              <Text style={[styles.chipText, pinnedId === p.id && styles.chipTextActive]}>{p.name} · {p.price} MSH</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      {pinnedId && <Text style={styles.successText}>Pinned live — viewers can buy now.</Text>}
      <ErrorText error={error} />
    </Panel>
  );
}

// ── Food Live ────────────────────────────────────────────────────────────
function FoodHost({ roomId, run, error, busy }: { roomId: string; run: RunFn; error: string; busy: boolean }) {
  const [products, setProducts] = useState<any[]>([]);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const styles = useHostPanelStyles();

  useEffect(() => { api.getMyEatStore().then(s => setProducts(s?.products || [])).catch(() => {}); }, []);

  return (
    <Panel title="Pin a menu item">
      {products.length === 0 ? (
        <Text style={styles.hint}>You don't have any menu items yet — add some in My Store first.</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {products.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[styles.chip, pinnedId === p.id && styles.chipActive]}
              onPress={() => run(() => api.pinEatProduct(roomId, p.id), () => setPinnedId(p.id))}
              disabled={busy}
            >
              <Text style={[styles.chipText, pinnedId === p.id && styles.chipTextActive]}>{p.name} · {p.price} MSH</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      {pinnedId && <Text style={styles.successText}>Pinned live — viewers can order now.</Text>}
      <ErrorText error={error} />
    </Panel>
  );
}

// ── Gaming Live ──────────────────────────────────────────────────────────
function GamingHost({ roomId, run, error, busy }: { roomId: string; run: RunFn; error: string; busy: boolean }) {
  const [gameType, setGameType] = useState('pool');
  const [gameId, setGameId] = useState('');
  const [linked, setLinked] = useState(false);
  const { theme } = useTheme();
  const { COLORS } = theme;
  const styles = useHostPanelStyles();

  return (
    <Panel title="Link a live game">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 10 }}>
        {GAME_TYPES.map(g => (
          <TouchableOpacity key={g.id} style={[styles.chip, gameType === g.id && styles.chipActive]} onPress={() => setGameType(g.id)}>
            <Ionicons name={g.icon as any} size={13} color={gameType === g.id ? '#fff' : COLORS.textMuted} />
            <Text style={[styles.chipText, gameType === g.id && styles.chipTextActive]}>{g.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TextInput
        style={styles.input}
        placeholder="Paste the game ID from your game screen"
        placeholderTextColor={COLORS.textMuted}
        value={gameId}
        onChangeText={setGameId}
      />
      <TouchableOpacity
        style={styles.actionBtn}
        disabled={busy || !gameId.trim()}
        onPress={() => run(() => api.linkGame(roomId, gameType, gameId.trim()), () => setLinked(true))}
      >
        <Text style={styles.actionBtnText}>Link Game</Text>
      </TouchableOpacity>
      {linked && <Text style={styles.successText}>Linked — viewers can see it's live now.</Text>}
      <ErrorText error={error} />
    </Panel>
  );
}

// ── Business Live ────────────────────────────────────────────────────────
function BusinessHost() {
  const styles = useHostPanelStyles();
  return (
    <Panel title="Networking">
      <Text style={styles.hint}>Viewers can tap "Connect" to open a real chat with you — check your Chats tab.</Text>
    </Panel>
  );
}

// ── Education Live ───────────────────────────────────────────────────────
function EducationHost({ roomId, run, error, busy }: { roomId: string; run: RunFn; error: string; busy: boolean }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [prizePool, setPrizePool] = useState('');
  const [quiz, setQuiz] = useState<any>(null);
  const { theme } = useTheme();
  const { COLORS } = theme;
  const styles = useHostPanelStyles();

  const setOption = (i: number, v: string) => setOptions(prev => prev.map((o, idx) => idx === i ? v : o));

  const launch = () => run(
    () => api.launchQuiz(roomId, question.trim(), options.map(o => o.trim()).filter(Boolean), correctIndex, Number(prizePool) || 0),
    (q) => setQuiz(q),
  );

  const resolve = () => run(() => api.resolveQuiz(quiz.id), () => setQuiz((q: any) => ({ ...q, status: 'RESOLVED' })));

  if (quiz && quiz.status !== 'RESOLVED') {
    return (
      <Panel title="Quiz is live">
        <Text style={styles.hint}>{quiz.question}</Text>
        <TouchableOpacity style={styles.actionBtn} disabled={busy} onPress={resolve}>
          <Text style={styles.actionBtnText}>Resolve & Pay Winners</Text>
        </TouchableOpacity>
        <ErrorText error={error} />
      </Panel>
    );
  }

  return (
    <Panel title="Launch a quiz">
      <TextInput style={styles.input} placeholder="Question" placeholderTextColor={COLORS.textMuted} value={question} onChangeText={setQuestion} />
      {options.map((o, i) => (
        <View key={i} style={styles.optionRow}>
          <TouchableOpacity style={[styles.radio, correctIndex === i && styles.radioActive]} onPress={() => setCorrectIndex(i)} />
          <TextInput style={[styles.input, { flex: 1 }]} placeholder={`Option ${i + 1}`} placeholderTextColor={COLORS.textMuted} value={o} onChangeText={v => setOption(i, v)} />
        </View>
      ))}
      {options.length < 4 && (
        <TouchableOpacity onPress={() => setOptions(prev => [...prev, ''])}><Text style={styles.linkText}>+ Add option</Text></TouchableOpacity>
      )}
      <Text style={styles.hint}>Tap the dot next to the correct answer.</Text>
      <TextInput style={styles.input} placeholder="Prize pool (MSH, optional)" placeholderTextColor={COLORS.textMuted} value={prizePool} onChangeText={setPrizePool} keyboardType="decimal-pad" />
      <TouchableOpacity style={styles.actionBtn} disabled={busy || !question.trim() || options.filter(Boolean).length < 2} onPress={launch}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Launch Quiz</Text>}
      </TouchableOpacity>
      <ErrorText error={error} />
    </Panel>
  );
}

// ── Entertainment Live ───────────────────────────────────────────────────
function EntertainmentHost({ roomId, run, error, busy }: { roomId: string; run: RunFn; error: string; busy: boolean }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [poll, setPoll] = useState<any>(null);
  const { theme } = useTheme();
  const { COLORS } = theme;
  const styles = useHostPanelStyles();

  const setOption = (i: number, v: string) => setOptions(prev => prev.map((o, idx) => idx === i ? v : o));

  const launch = () => run(
    () => api.launchPoll(roomId, question.trim(), options.map(o => o.trim()).filter(Boolean)),
    (p) => setPoll(p),
  );

  if (poll) {
    return (
      <Panel title="Poll is live">
        <Text style={styles.hint}>{poll.question}</Text>
        <TouchableOpacity onPress={() => setPoll(null)}><Text style={styles.linkText}>Launch a new poll</Text></TouchableOpacity>
      </Panel>
    );
  }

  return (
    <Panel title="Launch a poll">
      <TextInput style={styles.input} placeholder="Question" placeholderTextColor={COLORS.textMuted} value={question} onChangeText={setQuestion} />
      {options.map((o, i) => (
        <TextInput key={i} style={styles.input} placeholder={`Option ${i + 1}`} placeholderTextColor={COLORS.textMuted} value={o} onChangeText={v => setOption(i, v)} />
      ))}
      {options.length < 4 && (
        <TouchableOpacity onPress={() => setOptions(prev => [...prev, ''])}><Text style={styles.linkText}>+ Add option</Text></TouchableOpacity>
      )}
      <TouchableOpacity style={styles.actionBtn} disabled={busy || !question.trim() || options.filter(Boolean).length < 2} onPress={launch}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Launch Poll</Text>}
      </TouchableOpacity>
      <ErrorText error={error} />
    </Panel>
  );
}

// ── Sports Live ──────────────────────────────────────────────────────────
function SportsHost({ roomId, run, error, busy }: { roomId: string; run: RunFn; error: string; busy: boolean }) {
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [pQuestion, setPQuestion] = useState('Who wins?');
  const [prediction, setPrediction] = useState<any>(null);
  const { theme } = useTheme();
  const { COLORS } = theme;
  const styles = useHostPanelStyles();

  const updateScore = (a: number, b: number) => run(() => api.updateScoreboard(roomId, { teamA, teamB, scoreA: a, scoreB: b }));

  return (
    <Panel title="Scoreboard">
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Team A" placeholderTextColor={COLORS.textMuted} value={teamA} onChangeText={setTeamA} />
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Team B" placeholderTextColor={COLORS.textMuted} value={teamB} onChangeText={setTeamB} />
      </View>
      <View style={styles.scoreRow}>
        <View style={styles.scoreSide}>
          <TouchableOpacity style={styles.scoreBtn} onPress={() => { const v = scoreA + 1; setScoreA(v); updateScore(v, scoreB); }}><Ionicons name="add" size={16} color="#fff" /></TouchableOpacity>
          <Text style={styles.scoreNum}>{scoreA}</Text>
          <TouchableOpacity style={styles.scoreBtn} onPress={() => { const v = Math.max(0, scoreA - 1); setScoreA(v); updateScore(v, scoreB); }}><Ionicons name="remove" size={16} color="#fff" /></TouchableOpacity>
        </View>
        <Text style={styles.scoreDivider}>—</Text>
        <View style={styles.scoreSide}>
          <TouchableOpacity style={styles.scoreBtn} onPress={() => { const v = scoreB + 1; setScoreB(v); updateScore(scoreA, v); }}><Ionicons name="add" size={16} color="#fff" /></TouchableOpacity>
          <Text style={styles.scoreNum}>{scoreB}</Text>
          <TouchableOpacity style={styles.scoreBtn} onPress={() => { const v = Math.max(0, scoreB - 1); setScoreB(v); updateScore(scoreA, v); }}><Ionicons name="remove" size={16} color="#fff" /></TouchableOpacity>
        </View>
      </View>
      <ErrorText error={error} />

      <View style={styles.divider} />
      <Text style={styles.panelTitle}>Prediction pool</Text>
      {prediction && prediction.status === 'OPEN' ? (
        <>
          <Text style={styles.hint}>{prediction.question} — {prediction.optionA} vs {prediction.optionB}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.actionBtn} disabled={busy} onPress={() => run(() => api.resolvePrediction(prediction.id, 'A'), () => setPrediction(null))}>
              <Text style={styles.actionBtnText}>{prediction.optionA} won</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} disabled={busy} onPress={() => run(() => api.resolvePrediction(prediction.id, 'B'), () => setPrediction(null))}>
              <Text style={styles.actionBtnText}>{prediction.optionB} won</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <TextInput style={styles.input} placeholder="Question" placeholderTextColor={COLORS.textMuted} value={pQuestion} onChangeText={setPQuestion} />
          <TouchableOpacity
            style={styles.actionBtn}
            disabled={busy || !teamA.trim() || !teamB.trim()}
            onPress={() => run(() => api.launchPrediction(roomId, pQuestion.trim(), teamA.trim(), teamB.trim()), (p) => setPrediction(p))}
          >
            <Text style={styles.actionBtnText}>Open Betting ({teamA || 'Team A'} vs {teamB || 'Team B'})</Text>
          </TouchableOpacity>
        </>
      )}
    </Panel>
  );
}

// ── Career Live ──────────────────────────────────────────────────────────
function CareerHost({ roomId, run, error, busy }: { roomId: string; run: RunFn; error: string; busy: boolean }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [salary, setSalary] = useState('');
  const [job, setJob] = useState<any>(null);
  const [applicants, setApplicants] = useState<any[]>([]);
  const { theme } = useTheme();
  const { COLORS } = theme;
  const styles = useHostPanelStyles();

  const post = () => run(() => api.postJob(roomId, title.trim(), description.trim(), salary.trim()), (j) => setJob(j));
  const loadApplicants = () => job && api.getJobApplicants(job.id).then(setApplicants).catch(() => {});

  if (job) {
    return (
      <Panel title="Job posted">
        <Text style={styles.hint}>{job.title} {job.salary ? `· ${job.salary}` : ''}</Text>
        <TouchableOpacity style={styles.actionBtn} onPress={loadApplicants}>
          <Text style={styles.actionBtnText}>Refresh Applicants ({applicants.length})</Text>
        </TouchableOpacity>
        {applicants.map(a => (
          <View key={a.id} style={styles.applicantRow}>
            <Text style={styles.applicantName}>{a.applicant?.profile?.displayName || a.applicant?.username}</Text>
            {a.message ? <Text style={styles.hint}>{a.message}</Text> : null}
          </View>
        ))}
        <TouchableOpacity onPress={() => setJob(null)}><Text style={styles.linkText}>Post another job</Text></TouchableOpacity>
      </Panel>
    );
  }

  return (
    <Panel title="Post a job">
      <TextInput style={styles.input} placeholder="Job title" placeholderTextColor={COLORS.textMuted} value={title} onChangeText={setTitle} />
      <TextInput style={styles.input} placeholder="Description (optional)" placeholderTextColor={COLORS.textMuted} value={description} onChangeText={setDescription} />
      <TextInput style={styles.input} placeholder="Salary (optional)" placeholderTextColor={COLORS.textMuted} value={salary} onChangeText={setSalary} />
      <TouchableOpacity style={styles.actionBtn} disabled={busy || !title.trim()} onPress={post}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Post Job</Text>}
      </TouchableOpacity>
      <ErrorText error={error} />
    </Panel>
  );
}

// ── Social Live ──────────────────────────────────────────────────────────
function SocialHost({ roomId }: { roomId: string }) {
  const [questions, setQuestions] = useState<any[]>([]);
  const { theme } = useTheme();
  const { COLORS } = theme;
  const styles = useHostPanelStyles();

  const load = () => api.getRoomState(roomId).then(s => setQuestions(s.questions || [])).catch(() => {});
  useEffect(() => { load(); }, [roomId]);

  const markAnswered = (id: string) =>
    api.markQuestionAnswered(id).then(() => setQuestions(prev => prev.map(q => q.id === id ? { ...q, answered: true } : q))).catch(() => {});

  return (
    <Panel title="Live Q&A queue">
      <TouchableOpacity onPress={load}><Text style={styles.linkText}>Refresh</Text></TouchableOpacity>
      {questions.length === 0 ? (
        <Text style={styles.hint}>No questions yet.</Text>
      ) : (
        questions.map(q => (
          <View key={q.id} style={styles.questionRow}>
            <Text style={[styles.hint, q.answered && { textDecorationLine: 'line-through' }]}>{q.text}</Text>
            {!q.answered && (
              <TouchableOpacity onPress={() => markAnswered(q.id)}>
                <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>
        ))
      )}
    </Panel>
  );
}

