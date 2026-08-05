import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';

const CATEGORIES = ['Festival', 'Comedy', 'Theatre', 'Sports'];

function toDateInput(iso?: string) {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export default function EventFormScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const eventId = route?.params?.eventId;
  const isEdit = !!eventId;

  const [loading, setLoading] = useState(isEdit);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('20:00');
  const [price, setPrice] = useState('0');
  const [ticketsTotal, setTicketsTotal] = useState('100');
  const [ticketsAvailable, setTicketsAvailable] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    fetchApi(`/entertainment/events/${eventId}`)
      .then(r => r.json())
      .then(event => {
        setTitle(event.title);
        setCategory(event.category);
        setVenue(event.venue);
        setCity(event.city);
        const { date: d, time: t } = toDateInput(event.startsAt);
        setDate(d);
        setTime(t);
        setPrice(String(event.price));
        setTicketsTotal(String(event.ticketsTotal));
        setTicketsAvailable(event.ticketsAvailable);
        setDescription(event.description || '');
        setPosterUrl(event.posterUrl || '');
      })
      .catch(() => setError('Failed to load event'))
      .finally(() => setLoading(false));
  }, [eventId, isEdit]);

  const save = async () => {
    if (!title.trim() || !venue.trim() || !city.trim() || !date.trim()) {
      setError('Title, venue, city and date are required');
      return;
    }
    const startsAt = new Date(`${date}T${time || '00:00'}:00`);
    if (isNaN(startsAt.getTime())) { setError('Enter a valid date (YYYY-MM-DD) and time (HH:MM)'); return; }

    setSaving(true);
    setError('');
    try {
      const body: any = {
        title: title.trim(), category, venue: venue.trim(), city: city.trim(),
        startsAt: startsAt.toISOString(),
        price: parseFloat(price) || 0,
        description: description.trim() || undefined,
        posterUrl: posterUrl.trim() || undefined,
      };
      if (!isEdit) body.ticketsTotal = Math.max(1, parseInt(ticketsTotal, 10) || 100);

      const res = await fetchApi(isEdit ? `/entertainment/events/${eventId}` : '/entertainment/events', {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to save event');
      }
      const saved = await res.json();
      navigation.replace('ManageEvent', { eventId: saved.id });
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    label: { color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 8 },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14, color: COLORS.text, fontSize: 14 },
    readonlyInput: { justifyContent: 'center' },
    row: { flexDirection: 'row', gap: 12 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    chipActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
    chipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
    chipTextActive: { color: '#fff' },
    errorText: { color: '#ef4444', fontSize: 13 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
    saveBtn: { backgroundColor: '#10B981', borderRadius: 14, padding: 16, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  }));

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Event' : 'Create Event'}</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 20, paddingBottom: 100 }}>
        <View>
          <Text style={styles.label}>Title *</Text>
          <TextInput style={styles.input} placeholder="e.g. Sunset Jazz Festival" placeholderTextColor={COLORS.textMuted} value={title} onChangeText={setTitle} />
        </View>

        <View>
          <Text style={styles.label}>Category</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity key={cat} style={[styles.chip, category === cat && styles.chipActive]} onPress={() => setCategory(cat)}>
                <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Venue *</Text>
            <TextInput style={styles.input} placeholder="e.g. Green Park" placeholderTextColor={COLORS.textMuted} value={venue} onChangeText={setVenue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>City *</Text>
            <TextInput style={styles.input} placeholder="e.g. Cape Town" placeholderTextColor={COLORS.textMuted} value={city} onChangeText={setCity} />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Date *</Text>
            <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textMuted} value={date} onChangeText={setDate} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Time</Text>
            <TextInput style={styles.input} placeholder="HH:MM" placeholderTextColor={COLORS.textMuted} value={time} onChangeText={setTime} />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Price per ticket (MSH)</Text>
            <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={COLORS.textMuted} value={price} onChangeText={setPrice} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Total tickets</Text>
            {isEdit ? (
              <View style={[styles.input, styles.readonlyInput]}>
                <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>{ticketsAvailable} available / {ticketsTotal} total</Text>
              </View>
            ) : (
              <TextInput style={styles.input} keyboardType="number-pad" placeholder="100" placeholderTextColor={COLORS.textMuted} value={ticketsTotal} onChangeText={setTicketsTotal} />
            )}
          </View>
        </View>

        <View>
          <Text style={styles.label}>Poster image URL (optional)</Text>
          <TextInput style={styles.input} placeholder="https://..." placeholderTextColor={COLORS.textMuted} value={posterUrl} onChangeText={setPosterUrl} autoCapitalize="none" />
        </View>

        <View>
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="What's this event about?" placeholderTextColor={COLORS.textMuted} value={description} onChangeText={setDescription} multiline />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{isEdit ? 'Save Changes' : 'Create Event'}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
