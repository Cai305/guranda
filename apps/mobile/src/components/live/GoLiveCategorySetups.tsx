import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../theme';
import * as api from '../../data/liveCategoryApi';
import { registerGoLiveSetup, GoLiveSetupProps } from './goLiveSetupRegistry';

const styles = StyleSheet.create({
  hint: { color: COLORS.textMuted, fontSize: 12, lineHeight: 17, marginBottom: SPACING.sm },
  input: {
    backgroundColor: COLORS.surface, color: COLORS.text, padding: 12,
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#FFF' },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.sm },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: COLORS.border },
  radioActive: { backgroundColor: COLORS.success, borderColor: COLORS.success },
});

// ── Live Shopping — build the showcase before you're even live ────────────
interface ShoppingSetup { productIds: string[]; style: 'SPOTLIGHT' | 'SHELF' }
function ShoppingSetupPanel({ value, onChange }: GoLiveSetupProps<ShoppingSetup>) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.getMyShoppingStore().then(s => setProducts(s?.products || [])).catch(() => {}).finally(() => setLoading(false)); }, []);

  const toggle = (id: string) => {
    const has = value.productIds.includes(id);
    if (!has && value.productIds.length >= 10) return;
    onChange({ ...value, productIds: has ? value.productIds.filter(p => p !== id) : [...value.productIds, id] });
  };

  if (loading) return <ActivityIndicator color={COLORS.primary} style={{ marginVertical: SPACING.sm }} />;
  if (products.length === 0) {
    return <Text style={styles.hint}>You don't have any products yet — add some in My Shop first, or go live and build your showcase later.</Text>;
  }
  return (
    <View>
      <Text style={styles.hint}>Pick up to 10 products to showcase the moment you go live (optional — you can also do this later).</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: SPACING.sm }}>
        {products.map(p => {
          const active = value.productIds.includes(p.id);
          return (
            <TouchableOpacity key={p.id} style={[styles.chip, active && styles.chipActive]} onPress={() => toggle(p.id)}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{p.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {value.productIds.length > 0 && (
        <View style={styles.optionRow}>
          <TouchableOpacity style={styles.optionRow} onPress={() => onChange({ ...value, style: 'SPOTLIGHT' })}>
            <View style={[styles.radio, value.style === 'SPOTLIGHT' && styles.radioActive]} />
            <Text style={styles.hint}>Spotlight</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionRow} onPress={() => onChange({ ...value, style: 'SHELF' })}>
            <View style={[styles.radio, value.style === 'SHELF' && styles.radioActive]} />
            <Text style={styles.hint}>Shelf</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
registerGoLiveSetup('shopping', {
  Panel: ShoppingSetupPanel,
  initialValue: { productIds: [], style: 'SPOTLIGHT' } as ShoppingSetup,
  apply: (roomId, value: ShoppingSetup) =>
    value.productIds.length > 0 ? api.saveShowcase(roomId, value.productIds, value.style) : Promise.resolve(),
});

// ── Food Live — pin your first menu item before you go live ───────────────
interface FoodSetup { productId: string | null }
function FoodSetupPanel({ value, onChange }: GoLiveSetupProps<FoodSetup>) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.getMyEatStore().then(s => setProducts(s?.products || [])).catch(() => {}).finally(() => setLoading(false)); }, []);

  if (loading) return <ActivityIndicator color={COLORS.primary} style={{ marginVertical: SPACING.sm }} />;
  if (products.length === 0) {
    return <Text style={styles.hint}>You don't have any menu items yet — add some in My Store first, or go live and pin one later.</Text>;
  }
  return (
    <View>
      <Text style={styles.hint}>Pin a menu item viewers can order the moment you go live (optional).</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {products.map(p => (
          <TouchableOpacity
            key={p.id}
            style={[styles.chip, value.productId === p.id && styles.chipActive]}
            onPress={() => onChange({ productId: value.productId === p.id ? null : p.id })}
          >
            <Text style={[styles.chipText, value.productId === p.id && styles.chipTextActive]}>{p.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
registerGoLiveSetup('food', {
  Panel: FoodSetupPanel,
  initialValue: { productId: null } as FoodSetup,
  apply: (roomId, value: FoodSetup) => value.productId ? api.pinEatProduct(roomId, value.productId) : Promise.resolve(),
});

// ── Education Live — write your first quiz before you go live ─────────────
interface EducationSetup { question: string; options: string[]; correctIndex: number; prizePool: string }
function EducationSetupPanel({ value, onChange }: GoLiveSetupProps<EducationSetup>) {
  const setOption = (i: number, v: string) => onChange({ ...value, options: value.options.map((o, idx) => idx === i ? v : o) });
  return (
    <View>
      <Text style={styles.hint}>Write your first quiz question now, or skip and launch one once you're live.</Text>
      <TextInput style={styles.input} placeholder="Question (optional)" placeholderTextColor={COLORS.textMuted} value={value.question} onChangeText={q => onChange({ ...value, question: q })} />
      {value.options.map((o, i) => (
        <View key={i} style={styles.optionRow}>
          <TouchableOpacity style={[styles.radio, value.correctIndex === i && styles.radioActive]} onPress={() => onChange({ ...value, correctIndex: i })} />
          <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder={`Option ${i + 1}`} placeholderTextColor={COLORS.textMuted} value={o} onChangeText={v => setOption(i, v)} />
        </View>
      ))}
      <TextInput style={styles.input} placeholder="Prize pool (R, optional)" placeholderTextColor={COLORS.textMuted} value={value.prizePool} onChangeText={v => onChange({ ...value, prizePool: v })} keyboardType="decimal-pad" />
    </View>
  );
}
registerGoLiveSetup('education', {
  Panel: EducationSetupPanel,
  initialValue: { question: '', options: ['', ''], correctIndex: 0, prizePool: '' } as EducationSetup,
  apply: (roomId, value: EducationSetup) => {
    const opts = value.options.map(o => o.trim()).filter(Boolean);
    return value.question.trim() && opts.length >= 2
      ? api.launchQuiz(roomId, value.question.trim(), opts, value.correctIndex, Number(value.prizePool) || 0)
      : Promise.resolve();
  },
});

// ── Entertainment Live — line up your first poll ───────────────────────────
interface EntertainmentSetup { question: string; options: string[] }
function EntertainmentSetupPanel({ value, onChange }: GoLiveSetupProps<EntertainmentSetup>) {
  const setOption = (i: number, v: string) => onChange({ ...value, options: value.options.map((o, idx) => idx === i ? v : o) });
  return (
    <View>
      <Text style={styles.hint}>Line up your first poll now, or skip and launch one once you're live.</Text>
      <TextInput style={styles.input} placeholder="Question (optional)" placeholderTextColor={COLORS.textMuted} value={value.question} onChangeText={q => onChange({ ...value, question: q })} />
      {value.options.map((o, i) => (
        <TextInput key={i} style={styles.input} placeholder={`Option ${i + 1}`} placeholderTextColor={COLORS.textMuted} value={o} onChangeText={v => setOption(i, v)} />
      ))}
    </View>
  );
}
registerGoLiveSetup('entertainment', {
  Panel: EntertainmentSetupPanel,
  initialValue: { question: '', options: ['', ''] } as EntertainmentSetup,
  apply: (roomId, value: EntertainmentSetup) => {
    const opts = value.options.map(o => o.trim()).filter(Boolean);
    return value.question.trim() && opts.length >= 2 ? api.launchPoll(roomId, value.question.trim(), opts) : Promise.resolve();
  },
});

// ── Sports Live — name the teams before you go live ────────────────────────
interface SportsSetup { teamA: string; teamB: string }
function SportsSetupPanel({ value, onChange }: GoLiveSetupProps<SportsSetup>) {
  return (
    <View>
      <Text style={styles.hint}>Name the teams so your scoreboard is ready the moment you go live (optional).</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Team A" placeholderTextColor={COLORS.textMuted} value={value.teamA} onChangeText={v => onChange({ ...value, teamA: v })} />
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Team B" placeholderTextColor={COLORS.textMuted} value={value.teamB} onChangeText={v => onChange({ ...value, teamB: v })} />
      </View>
    </View>
  );
}
registerGoLiveSetup('sports', {
  Panel: SportsSetupPanel,
  initialValue: { teamA: '', teamB: '' } as SportsSetup,
  apply: (roomId, value: SportsSetup) =>
    value.teamA.trim() && value.teamB.trim()
      ? api.updateScoreboard(roomId, { teamA: value.teamA.trim(), teamB: value.teamB.trim(), scoreA: 0, scoreB: 0 })
      : Promise.resolve(),
});

// ── Career Live — post the job before you go live ──────────────────────────
interface CareerSetup { title: string; description: string; salary: string }
function CareerSetupPanel({ value, onChange }: GoLiveSetupProps<CareerSetup>) {
  return (
    <View>
      <Text style={styles.hint}>Post the role so applicants can apply from the second you go live (optional).</Text>
      <TextInput style={styles.input} placeholder="Job title" placeholderTextColor={COLORS.textMuted} value={value.title} onChangeText={v => onChange({ ...value, title: v })} />
      <TextInput style={styles.input} placeholder="Description (optional)" placeholderTextColor={COLORS.textMuted} value={value.description} onChangeText={v => onChange({ ...value, description: v })} />
      <TextInput style={styles.input} placeholder="Salary (optional)" placeholderTextColor={COLORS.textMuted} value={value.salary} onChangeText={v => onChange({ ...value, salary: v })} />
    </View>
  );
}
registerGoLiveSetup('career', {
  Panel: CareerSetupPanel,
  initialValue: { title: '', description: '', salary: '' } as CareerSetup,
  apply: (roomId, value: CareerSetup) =>
    value.title.trim() ? api.postJob(roomId, value.title.trim(), value.description.trim(), value.salary.trim()) : Promise.resolve(),
});

// ── Gaming Live — pick what you're playing, start Chess right away ────────
const GAME_TYPES = [
  { id: 'pool', label: 'Pool' },
  { id: 'ludo', label: 'Ludo' },
  { id: 'chess', label: 'Chess' },
  { id: 'murabaraba', label: 'Murabaraba' },
  { id: 'wordbattle', label: 'Word Battle' },
];
interface GamingSetup { gameType: string; opponentId: string | null }
function GamingSetupPanel({ value, onChange }: GoLiveSetupProps<GamingSetup>) {
  const [friends, setFriends] = useState<any[]>([]);
  useEffect(() => {
    if (value.gameType === 'chess' && friends.length === 0) {
      api.getFriends().then((rows: any[]) => setFriends(rows.map(r => r.user))).catch(() => {});
    }
  }, [value.gameType]);

  return (
    <View>
      <Text style={styles.hint}>What are you playing?</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: SPACING.sm }}>
        {GAME_TYPES.map(g => (
          <TouchableOpacity key={g.id} style={[styles.chip, value.gameType === g.id && styles.chipActive]} onPress={() => onChange({ gameType: g.id, opponentId: null })}>
            <Text style={[styles.chipText, value.gameType === g.id && styles.chipTextActive]}>{g.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {value.gameType === 'chess' && (
        friends.length === 0 ? (
          <Text style={styles.hint}>No friends to challenge yet — you can start a match once you're live instead.</Text>
        ) : (
          <>
            <Text style={styles.hint}>Challenge a friend now (optional):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {friends.map(f => (
                <TouchableOpacity key={f.id} style={[styles.chip, value.opponentId === f.id && styles.chipActive]} onPress={() => onChange({ ...value, opponentId: value.opponentId === f.id ? null : f.id })}>
                  <Text style={[styles.chipText, value.opponentId === f.id && styles.chipTextActive]}>{f.profile?.displayName || f.username}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )
      )}
    </View>
  );
}
registerGoLiveSetup('gaming', {
  Panel: GamingSetupPanel,
  initialValue: { gameType: 'chess', opponentId: null } as GamingSetup,
  apply: (roomId, value: GamingSetup) =>
    value.gameType === 'chess' && value.opponentId
      ? api.startChessMatch(roomId, { mode: 'HOST_PLAYS', opponentId: value.opponentId })
      : Promise.resolve(),
});
