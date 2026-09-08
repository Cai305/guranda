import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';

type TransactionType = 'eat_order' | 'shopping_order' | 'hair_booking' | 'carwash_booking' | 'travel_stay' | 'travel_car';

interface Props {
  visible: boolean;
  title: string;
  transactionType: TransactionType;
  transactionId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

// One shared "leave a 1-5 star review" flow for every mini-app that has a
// real completed transaction (Eat, Shopping, Hair, Carwash, Travel Stay,
// Travel Car) — same POST /reviews call, same UI, wired in per screen with
// just a transactionType/transactionId/title instead of six bespoke modals.
export default function RateSellerModal({ visible, title, transactionType, transactionId, onClose, onSubmitted }: Props) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: SPACING.lg },
    card: {
      backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.lg, padding: SPACING.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder,
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    title: { color: COLORS.text, fontWeight: '800', fontSize: 16, flex: 1 },
    subtitle: { color: COLORS.textMuted, fontSize: 12, marginBottom: 16 },
    starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 },
    input: {
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.text, minHeight: 70, textAlignVertical: 'top',
    },
    submitBtn: {
      marginTop: 16, backgroundColor: COLORS.primary, borderRadius: RADIUS.pill,
      paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    },
    submitBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  }));

  const reset = () => { setRating(0); setComment(''); };

  const submit = async () => {
    if (rating === 0) {
      Alert.alert('Pick a rating', 'Tap a star from 1 to 5.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetchApi('/reviews', {
        method: 'POST',
        body: JSON.stringify({ transactionType, transactionId, rating, comment: comment.trim() || undefined }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Could not submit your review');
      }
      reset();
      onSubmitted();
    } catch (e: any) {
      Alert.alert('Couldn\'t submit review', e.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>Rate {title}</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.subtitle}>How was your experience?</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity key={n} onPress={() => setRating(n)}>
                  <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={34} color={COLORS.gold} />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Add a comment (optional)"
              placeholderTextColor={COLORS.textMuted}
              multiline
              value={comment}
              onChangeText={setComment}
            />
            <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Review</Text>}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
