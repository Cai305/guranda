import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Image, Alert, Modal, Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi, uploadMedia } from '../../utils/api';

const CATEGORIES = ['Festival', 'Comedy', 'Theatre', 'Sports', 'Music', 'Conference', 'Community'];

function toDateInput(iso?: string) {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

// ── Poster section sub-component ────────────────────────────────────────────
interface PosterSectionProps {
  posterUrl: string;
  onPosterUrl: (url: string) => void;
  eventId?: string;
  // fields needed for AI generation
  title: string;
  category: string;
  venue: string;
  city: string;
  date: string;
  navigation: any;
  designedPosterUri?: string;
  clearDesignedPosterUri: () => void;
}

function PosterSection({ posterUrl, onPosterUrl, eventId, title, category, venue, city, date, navigation, designedPosterUri, clearDesignedPosterUri }: PosterSectionProps) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const [uploading, setUploading]   = useState(false);
  const [generating, setGenerating] = useState(false);
  const [vibeModal, setVibeModal]   = useState(false);
  const [vibe, setVibe]             = useState('');

  // Handle poster returned from Poster Creator mini-app
  useEffect(() => {
    if (!designedPosterUri) return;
    clearDesignedPosterUri();
    (async () => {
      setUploading(true);
      try {
        const uploaded = await uploadMedia(designedPosterUri, 'image');
        onPosterUrl(uploaded.url);
      } catch (e: any) {
        Alert.alert('Upload failed', e.message || 'Could not upload the designed poster.');
      } finally {
        setUploading(false);
      }
    })();
  }, [designedPosterUri]);

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    container: { gap: 10 },
    label: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
    preview: {
      width: '100%', height: 180, borderRadius: RADIUS.lg, overflow: 'hidden',
      borderWidth: 1, borderColor: COLORS.border,
    },
    previewImg: { width: '100%', height: '100%' },
    previewFallback: {
      width: '100%', height: '100%',
      justifyContent: 'center', alignItems: 'center', gap: 8,
    },
    fallbackText: { color: COLORS.textMuted, fontSize: 13 },
    actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    actionBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, paddingVertical: 10, paddingHorizontal: 12,
      borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
      backgroundColor: COLORS.surfaceElevated, minWidth: 100,
    },
    actionBtnText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
    aiBtn: {
      flex: 1, borderRadius: RADIUS.lg, overflow: 'hidden', minWidth: 100,
    },
    aiBtnGrad: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, paddingVertical: 10, paddingHorizontal: 12,
    },
    aiBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    clearBtn: {
      width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(239,68,68,0.15)',
      borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
      justifyContent: 'center', alignItems: 'center',
    },
    // Vibe modal
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    vibeSheet: {
      backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: SPACING.lg, paddingBottom: 36, gap: 14,
    },
    vibeTitle: { color: COLORS.text, fontWeight: '800', fontSize: 17 },
    vibeDesc: { color: COLORS.textMuted, fontSize: 13, lineHeight: 19 },
    vibeInput: {
      backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.md,
      borderWidth: 1, borderColor: COLORS.border, padding: 14,
      color: COLORS.text, fontSize: 14, minHeight: 60,
    },
    vibeGenerateBtn: { borderRadius: RADIUS.lg, overflow: 'hidden' },
    vibeGenerateGrad: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, padding: 15,
    },
    vibeGenerateText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    vibeCancelBtn: { alignItems: 'center', paddingVertical: 10 },
    vibeCancelText: { color: COLORS.textMuted, fontSize: 14 },
    designBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, paddingVertical: 10, paddingHorizontal: 12,
      borderRadius: RADIUS.lg, overflow: 'hidden', minWidth: 100,
    },
    designBtnGrad: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, paddingVertical: 10, paddingHorizontal: 12,
    },
    designBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  }));

  const pickFromLibrary = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) { Alert.alert('Permission needed', 'Allow photo library access to upload a poster.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85,
    });
    if (result.canceled) return;
    try {
      setUploading(true);
      const uploaded = await uploadMedia(result.assets[0].uri, 'image');
      onPosterUrl(uploaded.url);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message || 'Could not upload the image.');
    } finally {
      setUploading(false);
    }
  };

  const generateWithAI = async (vibeText: string) => {
    if (!title.trim()) { Alert.alert('Add a title first', 'The AI needs the event title to generate a poster.'); return; }
    setVibeModal(false);
    setGenerating(true);
    try {
      const res = await fetchApi('/entertainment/events/generate-poster', {
        method: 'POST',
        body: JSON.stringify({
          eventId: eventId ?? undefined,
          title: title.trim(),
          category,
          venue: venue.trim() || 'TBC',
          city: city.trim() || 'TBC',
          date: date || 'TBC',
          vibe: vibeText.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Generation failed');
      }
      const { posterUrl: url } = await res.json();
      onPosterUrl(url);
    } catch (e: any) {
      Alert.alert('AI generation failed', e.message || 'Please try again or upload a poster manually.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Event Poster</Text>

      {/* Preview */}
      <View style={styles.preview}>
        {uploading || generating ? (
          <LinearGradient colors={['#1e1b4b', '#4c1d95', '#581c87']} style={styles.previewFallback}>
            <ActivityIndicator color="#a78bfa" size="large" />
            <Text style={[styles.fallbackText, { color: '#a78bfa' }]}>
              {generating ? 'AI is creating your poster…' : 'Uploading…'}
            </Text>
          </LinearGradient>
        ) : posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.previewImg} resizeMode="cover" />
        ) : (
          <LinearGradient colors={['#1e1b4b', '#312e81']} style={styles.previewFallback}>
            <Ionicons name="image-outline" size={40} color="rgba(167,139,250,0.4)" />
            <Text style={styles.fallbackText}>No poster yet</Text>
          </LinearGradient>
        )}
      </View>

      {/* Action row */}
      <View style={styles.actions}>
        {/* Upload from library */}
        <TouchableOpacity style={styles.actionBtn} onPress={pickFromLibrary} disabled={uploading || generating}>
          <Ionicons name="image-outline" size={16} color={COLORS.text} />
          <Text style={styles.actionBtnText}>Upload</Text>
        </TouchableOpacity>

        {/* AI Generate */}
        <TouchableOpacity style={styles.aiBtn} onPress={() => setVibeModal(true)} disabled={uploading || generating}>
          <LinearGradient colors={['#7c3aed', '#db2777']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.aiBtnGrad}>
            <Ionicons name="sparkles" size={16} color="#fff" />
            <Text style={styles.aiBtnText}>AI Generate</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Clear */}
        {!!posterUrl && (
          <TouchableOpacity style={styles.clearBtn} onPress={() => onPosterUrl('')} disabled={uploading || generating}>
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>

      {/* Design in Poster Creator */}
      <TouchableOpacity
        style={styles.designBtn}
        onPress={() => navigation.navigate('PosterCreator', {
          returnScreen: 'EventForm',
          returnParamKey: 'designedPosterUri',
          initialCategory: 'event',
        })}
        disabled={uploading || generating}
      >
        <LinearGradient colors={['#10B981', '#22D3EE']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.designBtnGrad}>
          <Ionicons name="brush-outline" size={16} color="#fff" />
          <Text style={styles.designBtnText}>Design in Poster Creator</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Vibe prompt modal */}
      <Modal visible={vibeModal} transparent animationType="slide" onRequestClose={() => setVibeModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVibeModal(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.vibeSheet}>
              <Text style={styles.vibeTitle}>✨ AI Poster Generator</Text>
              <Text style={styles.vibeDesc}>
                Describe the mood, colours or theme you want — or leave it blank and the AI will decide based on the event details.
              </Text>
              <TextInput
                style={styles.vibeInput}
                placeholder="e.g. Warm sunset colours, festival energy, abstract crowd…"
                placeholderTextColor={COLORS.textMuted}
                value={vibe}
                onChangeText={setVibe}
                multiline
              />
              <TouchableOpacity style={styles.vibeGenerateBtn} onPress={() => generateWithAI(vibe)}>
                <LinearGradient colors={['#7c3aed', '#db2777']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.vibeGenerateGrad}>
                  <Ionicons name="sparkles" size={18} color="#fff" />
                  <Text style={styles.vibeGenerateText}>Generate Poster</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.vibeCancelBtn} onPress={() => setVibeModal(false)}>
                <Text style={styles.vibeCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function EventFormScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const eventId = route?.params?.eventId;
  const isEdit  = !!eventId;

  const [loading, setLoading]               = useState(isEdit);
  const [title, setTitle]                   = useState('');
  const [category, setCategory]             = useState(CATEGORIES[0]);
  const [venue, setVenue]                   = useState('');
  const [city, setCity]                     = useState('');
  const [date, setDate]                     = useState('');
  const [time, setTime]                     = useState('20:00');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [price, setPrice]                   = useState('0');
  const [ticketsTotal, setTicketsTotal]     = useState('100');
  const [ticketsAvailable, setTicketsAvailable] = useState<number | null>(null);
  const [description, setDescription]       = useState('');
  const [posterUrl, setPosterUrl]           = useState('');
  const [saving, setSaving]                 = useState(false);
  const [error, setError]                   = useState('');

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
        setDate(d); setTime(t);
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
      setError('Title, venue, city and date are required'); return;
    }
    const startsAt = new Date(`${date}T${time || '00:00'}:00`);
    if (isNaN(startsAt.getTime())) { setError('Enter a valid date (YYYY-MM-DD) and time (HH:MM)'); return; }

    setSaving(true); setError('');
    try {
      const body: any = {
        title: title.trim(), category,
        venue: venue.trim(), city: city.trim(),
        startsAt: startsAt.toISOString(),
        price: parseFloat(price) || 0,
        description: description.trim() || undefined,
        posterUrl: posterUrl.trim() || undefined,
      };
      if (!isEdit) body.ticketsTotal = Math.max(1, parseInt(ticketsTotal, 10) || 100);

      const res = await fetchApi(
        isEdit ? `/entertainment/events/${eventId}` : '/entertainment/events',
        { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(body) },
      );
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

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING, RADIUS }) => ({
    container:     { flex: 1, backgroundColor: COLORS.background },
    center:        { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back:          { padding: 4 },
    headerTitle:   { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    sectionTitle:  { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 4 },
    label:         { color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 8 },
    input: {
      backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
      borderWidth: 1, borderColor: COLORS.border, padding: 14,
      color: COLORS.text, fontSize: 14,
    },
    readonlyInput: { justifyContent: 'center' },
    row:           { flexDirection: 'row', gap: 12 },
    chip: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
      backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    },
    chipActive:    { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
    chipText:      { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
    chipTextActive:{ color: '#fff' },
    errorText:     { color: '#ef4444', fontSize: 13 },
    footer: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      padding: SPACING.lg, backgroundColor: COLORS.background,
      borderTopWidth: 1, borderTopColor: COLORS.border,
    },
    saveBtn:       { borderRadius: RADIUS.lg, overflow: 'hidden' },
    saveBtnGrad:   { padding: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
    saveBtnText:   { color: '#fff', fontWeight: '700', fontSize: 16 },
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: SPACING.lg, gap: 20, paddingBottom: 110 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Basic info ────────────────────────── */}
        <Text style={styles.sectionTitle}>Event Details</Text>

        <View>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input} placeholder="e.g. Sunset Jazz Festival"
            placeholderTextColor={COLORS.textMuted} value={title} onChangeText={setTitle}
          />
        </View>

        <View>
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity key={cat} style={[styles.chip, category === cat && styles.chipActive]} onPress={() => setCategory(cat)}>
                <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
          {/* ── Date picker ── */}
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Date *</Text>
            {Platform.OS === 'web' ? (
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textMuted}
                value={date}
                onChangeText={setDate}
              />
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.input, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar-outline" size={18} color={date ? COLORS.text : COLORS.textMuted} />
                  <Text style={{ color: date ? COLORS.text : COLORS.textMuted, fontSize: 14, flex: 1 }}>
                    {date
                      ? new Date(date + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
                      : 'Select date'}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && Platform.OS === 'ios' && (
                  <Modal transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
                    <TouchableOpacity style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }} activeOpacity={1} onPress={() => setShowDatePicker(false)}>
                      <View style={{ backgroundColor: COLORS.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 30, paddingTop: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, marginBottom: 8 }}>
                          <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                            <Text style={{ color: '#7c3aed', fontWeight: '700', fontSize: 16 }}>Done</Text>
                          </TouchableOpacity>
                        </View>
                        <DateTimePicker
                          value={date ? new Date(date + 'T00:00:00') : new Date()}
                          mode="date"
                          display="inline"
                          minimumDate={new Date()}
                          themeVariant="dark"
                          onChange={(_: DateTimePickerEvent, selected?: Date) => {
                            if (selected) {
                              const y = selected.getFullYear();
                              const m = String(selected.getMonth() + 1).padStart(2, '0');
                              const d = String(selected.getDate()).padStart(2, '0');
                              setDate(`${y}-${m}-${d}`);
                            }
                          }}
                        />
                      </View>
                    </TouchableOpacity>
                  </Modal>
                )}
                {showDatePicker && Platform.OS === 'android' && (
                  <DateTimePicker
                    value={date ? new Date(date + 'T00:00:00') : new Date()}
                    mode="date"
                    display="calendar"
                    minimumDate={new Date()}
                    onChange={(_: DateTimePickerEvent, selected?: Date) => {
                      setShowDatePicker(false);
                      if (selected) {
                        const y = selected.getFullYear();
                        const m = String(selected.getMonth() + 1).padStart(2, '0');
                        const d = String(selected.getDate()).padStart(2, '0');
                        setDate(`${y}-${m}-${d}`);
                      }
                    }}
                  />
                )}
              </>
            )}
          </View>

          {/* ── Time picker ── */}
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Time</Text>
            {Platform.OS === 'web' ? (
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                placeholderTextColor={COLORS.textMuted}
                value={time}
                onChangeText={setTime}
              />
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.input, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
                  onPress={() => setShowTimePicker(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time-outline" size={18} color={COLORS.text} />
                  <Text style={{ color: COLORS.text, fontSize: 14, flex: 1 }}>
                    {time || '20:00'}
                  </Text>
                </TouchableOpacity>
                {showTimePicker && Platform.OS === 'ios' && (
                  <Modal transparent animationType="slide" onRequestClose={() => setShowTimePicker(false)}>
                    <TouchableOpacity style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }} activeOpacity={1} onPress={() => setShowTimePicker(false)}>
                      <View style={{ backgroundColor: COLORS.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 30, paddingTop: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, marginBottom: 8 }}>
                          <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                            <Text style={{ color: '#7c3aed', fontWeight: '700', fontSize: 16 }}>Done</Text>
                          </TouchableOpacity>
                        </View>
                        <DateTimePicker
                          value={(() => { const [h, m] = (time || '20:00').split(':').map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return d; })()}
                          mode="time"
                          display="spinner"
                          is24Hour={true}
                          themeVariant="dark"
                          onChange={(_: DateTimePickerEvent, selected?: Date) => {
                            if (selected) {
                              const hh = String(selected.getHours()).padStart(2, '0');
                              const mm = String(selected.getMinutes()).padStart(2, '0');
                              setTime(`${hh}:${mm}`);
                            }
                          }}
                        />
                      </View>
                    </TouchableOpacity>
                  </Modal>
                )}
                {showTimePicker && Platform.OS === 'android' && (
                  <DateTimePicker
                    value={(() => { const [h, m] = (time || '20:00').split(':').map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return d; })()}
                    mode="time"
                    display="clock"
                    is24Hour={true}
                    onChange={(_: DateTimePickerEvent, selected?: Date) => {
                      setShowTimePicker(false);
                      if (selected) {
                        const hh = String(selected.getHours()).padStart(2, '0');
                        const mm = String(selected.getMinutes()).padStart(2, '0');
                        setTime(`${hh}:${mm}`);
                      }
                    }}
                  />
                )}
              </>
            )}
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Price per ticket (R)</Text>
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
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, { minHeight: 80 }]}
            placeholder="What's this event about?"
            placeholderTextColor={COLORS.textMuted}
            value={description} onChangeText={setDescription} multiline
          />
        </View>

        {/* ── Poster ────────────────────────────── */}
        <Text style={styles.sectionTitle}>Poster</Text>
        <PosterSection
          posterUrl={posterUrl}
          onPosterUrl={setPosterUrl}
          eventId={isEdit ? eventId : undefined}
          title={title}
          category={category}
          venue={venue}
          city={city}
          date={date}
          navigation={navigation}
          designedPosterUri={route?.params?.designedPosterUri}
          clearDesignedPosterUri={() => navigation.setParams({ designedPosterUri: undefined })}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          <LinearGradient colors={['#7c3aed', '#db2777']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtnGrad}>
            {saving
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name={isEdit ? 'checkmark-circle' : 'add-circle'} size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>{isEdit ? 'Save Changes' : 'Create Event'}</Text>
                </>
            }
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
