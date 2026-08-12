import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { formatCurrency } from '../../utils/format';

export default function HealthPractitionerDetailScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const { practitionerId } = route.params;
  const [practitioner, setPractitioner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchApi(`/health/practitioners/${practitionerId}`).then(r => r.json()).then(setPractitioner).catch(() => {}).finally(() => setLoading(false));
  }, [practitionerId]);

  const book = async () => {
    setError('');
    if (!date.trim() || !time.trim()) { setError('Pick a date and time (YYYY-MM-DD and HH:MM)'); return; }
    const scheduledAt = new Date(`${date.trim()}T${time.trim()}:00`);
    if (isNaN(scheduledAt.getTime())) { setError('Invalid date/time format'); return; }
    setBooking(true);
    try {
      const res = await fetchApi(`/health/practitioners/${practitionerId}/book`, {
        method: 'POST',
        body: JSON.stringify({ scheduledAt: scheduledAt.toISOString(), reason: reason.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Booking failed');
      }
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setBooking(false);
    }
  };

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
    avatar: { width: 60, height: 60, borderRadius: 16 },
    avatarPlaceholder: { width: 60, height: 60, borderRadius: 16, backgroundColor: '#F8717115', justifyContent: 'center', alignItems: 'center' },
    name: { ...TYPOGRAPHY.h2, marginBottom: 2 },
    specialty: { color: '#F87171', fontSize: 13, fontWeight: '600' },
    bio: { color: COLORS.textMuted, fontSize: 14, lineHeight: 21, marginBottom: 16 },
    feeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
    feeLabel: { color: COLORS.textMuted, fontSize: 13 },
    fee: { color: '#F87171', fontWeight: '800', fontSize: 18 },
    section: { marginBottom: 20 },
    sectionTitle: { ...TYPOGRAPHY.label, fontSize: 11, marginBottom: 10 },
    dateRow: { flexDirection: 'row', gap: 12 },
    dateLabel: { color: COLORS.textMuted, fontSize: 12, marginBottom: 6 },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 12, color: COLORS.text, fontSize: 14 },
    errorText: { color: '#ef4444', fontSize: 13 },
    actionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
    bookBtn: { backgroundColor: '#F87171', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
    bookBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg, gap: 12 },
    successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    successTitle: { ...TYPOGRAPHY.h2 },
    successSub: { color: COLORS.textMuted, fontSize: 14, marginBottom: 16, textAlign: 'center' },
    successBtn: { backgroundColor: '#F87171', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 },
    successBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    successLink: { color: COLORS.textMuted, fontSize: 13, marginTop: 12 },
  }));

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if (!practitioner) return <View style={styles.center}><Text style={{ color: COLORS.textMuted }}>Practitioner not found</Text></View>;

  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.successWrap}>
          <View style={styles.successIcon}><Ionicons name="checkmark" size={40} color="#fff" /></View>
          <Text style={styles.successTitle}>Appointment booked!</Text>
          <Text style={styles.successSub}>{practitioner.name} · {date} at {time}</Text>
          <TouchableOpacity style={styles.successBtn} onPress={() => navigation.navigate('HealthAppointments')}>
            <Text style={styles.successBtnText}>View My Appointments</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.successLink}>Back to browsing</Text>
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
        <Text style={styles.headerTitle} numberOfLines={1}>Book Appointment</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40 }}>
        <View style={styles.topRow}>
          {practitioner.avatarUrl ? <Image source={{ uri: practitioner.avatarUrl }} style={styles.avatar} /> : (
            <View style={styles.avatarPlaceholder}><Ionicons name="medkit" size={28} color="#F87171" /></View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{practitioner.name}</Text>
            <Text style={styles.specialty}>{practitioner.specialty}</Text>
          </View>
        </View>

        {practitioner.bio && <Text style={styles.bio}>{practitioner.bio}</Text>}

        <View style={styles.feeRow}>
          <Text style={styles.feeLabel}>Consultation fee</Text>
          <Text style={styles.fee}>{formatCurrency(practitioner.consultationFee)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pick a date & time</Text>
          <View style={styles.dateRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dateLabel}>Date</Text>
              <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textMuted} value={date} onChangeText={setDate} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dateLabel}>Time</Text>
              <TextInput style={styles.input} placeholder="HH:MM" placeholderTextColor={COLORS.textMuted} value={time} onChangeText={setTime} />
            </View>
          </View>
          <Text style={[styles.dateLabel, { marginTop: 12 }]}>Reason (optional)</Text>
          <TextInput style={styles.input} placeholder="Brief reason for the visit" placeholderTextColor={COLORS.textMuted} value={reason} onChangeText={setReason} />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.bookBtn} onPress={book} disabled={booking}>
          {booking ? <ActivityIndicator color="#fff" /> : <Text style={styles.bookBtnText}>Book · {formatCurrency(practitioner.consultationFee)}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
