import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../../theme';
import { fetchApi } from '../../utils/api';
import { ACCENT } from './LearningHomeScreen';

export default function TutorDetailScreen({ route, navigation }: any) {
  const { tutorId } = route.params;
  const [tutor, setTutor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [topic, setTopic] = useState('');
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchApi(`/learning/tutors/${tutorId}`)
      .then(r => r.json())
      .then(setTutor)
      .catch(() => setTutor(null))
      .finally(() => setLoading(false));
  }, [tutorId]);

  const book = async () => {
    if (!date || !time) { setError('Pick a date and time'); return; }
    const scheduledAt = new Date(`${date}T${time}:00`);
    if (isNaN(scheduledAt.getTime())) { setError('Invalid date/time'); return; }
    setBooking(true);
    setError('');
    try {
      const res = await fetchApi(`/learning/tutors/${tutorId}/book`, {
        method: 'POST',
        body: JSON.stringify({ scheduledAt: scheduledAt.toISOString(), topic: topic.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to book session');
      }
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!tutor) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tutor</Text>
          <View style={{ width: 30 }} />
        </View>
        <Text style={styles.hint}>Tutor not found.</Text>
      </SafeAreaView>
    );
  }

  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.successWrap}>
          <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
          <Text style={styles.successTitle}>Session booked!</Text>
          <Text style={styles.successSub}>{tutor.name} · {date} at {time}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('MySessions')}>
            <Text style={styles.primaryBtnText}>View My Sessions</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.linkText}>Back to browsing</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Book a Session</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 16 }}>
        <View style={styles.card}>
          <View style={styles.avatarPlaceholder}><Ionicons name="person" size={28} color={ACCENT} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tutorName}>{tutor.name}</Text>
            <Text style={styles.tutorSubjects}>{tutor.subjects}</Text>
          </View>
        </View>
        {tutor.bio ? <Text style={styles.bio}>{tutor.bio}</Text> : null}

        <View style={styles.feeRow}>
          <Text style={styles.feeLabel}>Hourly rate</Text>
          <Text style={styles.feeValue}>{tutor.hourlyRate} MSH</Text>
        </View>

        <Text style={styles.sectionLabel}>PICK A DATE & TIME</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Date</Text>
            <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textMuted} value={date} onChangeText={setDate} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Time</Text>
            <TextInput style={styles.input} placeholder="HH:MM" placeholderTextColor={COLORS.textMuted} value={time} onChangeText={setTime} />
          </View>
        </View>
        <View>
          <Text style={styles.label}>Topic (optional)</Text>
          <TextInput style={styles.input} placeholder="What do you need help with?" placeholderTextColor={COLORS.textMuted} value={topic} onChangeText={setTopic} />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity style={styles.primaryBtn} onPress={book} disabled={booking}>
          {booking ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Book · {tutor.hourlyRate} MSH</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
  back: { padding: 4 },
  headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  avatarPlaceholder: { width: 56, height: 56, borderRadius: 14, backgroundColor: `${ACCENT}15`, justifyContent: 'center', alignItems: 'center' },
  tutorName: { color: COLORS.text, fontWeight: '800', fontSize: 17 },
  tutorSubjects: { color: ACCENT, fontSize: 13, fontWeight: '600', marginTop: 2 },
  bio: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  feeLabel: { color: COLORS.textMuted, fontSize: 13 },
  feeValue: { color: ACCENT, fontWeight: '800', fontSize: 15 },
  sectionLabel: { ...TYPOGRAPHY.label, fontSize: 11 },
  row: { flexDirection: 'row', gap: 12 },
  label: { color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14, color: COLORS.text, fontSize: 14 },
  errorText: { color: '#ef4444', fontSize: 13 },
  primaryBtn: { backgroundColor: ACCENT, borderRadius: 14, padding: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  hint: { color: COLORS.textMuted, fontSize: 13, padding: SPACING.lg },
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: SPACING.lg },
  successTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  successSub: { color: COLORS.textMuted, fontSize: 13, marginBottom: 12 },
  linkText: { color: COLORS.textMuted, fontSize: 13, marginTop: 8 },
});
