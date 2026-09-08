import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Animated, Easing } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';

interface Briefing {
  text: string;
  state: 'personalized' | 'cold_start' | 'empty';
  generatedAt: string;
}

// Home's AI briefing (architecture Phase 7.3/7.4) — real narrated text from
// GET /home/briefing, not a static line. fetchApi's stale-while-revalidate
// already gives this the "offline" state for free: a cache hit renders
// instantly (even stale) and refreshes quietly in the background, so this
// component never needs its own offline branch. "AI thinking" only shows
// when there's truly no cache yet (first-ever open, or a cleared cache).
export default function HomeBriefingCard(_props: { navigation: any }) {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const pulse = React.useRef(new Animated.Value(0.4)).current;

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/home/briefing');
      if (res.ok) {
        setBriefing(await res.json());
        setErrored(false);
      } else if (!briefing) {
        setErrored(true);
      }
    } catch {
      if (!briefing) setErrored(true);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  React.useEffect(() => {
    if (!loading || briefing) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, easing: Easing.ease, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [loading, briefing, pulse]);

  const { theme } = useTheme();
  const { COLORS } = theme;

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    card: {
      marginHorizontal: SPACING.lg,
      marginBottom: SPACING.md,
      borderRadius: RADIUS.lg,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    iconWrap: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: 'rgba(139,92,246,0.18)',
      justifyContent: 'center', alignItems: 'center',
    },
    text: { flex: 1, color: COLORS.text, fontSize: 13.5, lineHeight: 19 },
    skeletonLine: { height: 12, borderRadius: 6, backgroundColor: COLORS.glass, marginBottom: 6 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: SPACING.lg },
    modalCard: {
      backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.lg, padding: SPACING.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    modalTitle: { color: COLORS.text, fontWeight: '800', fontSize: 16 },
    modalText: { color: COLORS.text, fontSize: 15, lineHeight: 22 },
    modalMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 14 },
  }));

  // Nothing to show yet and never will be (both fetch attempts failed with
  // no prior cache) — fail quiet rather than showing a broken-looking card.
  if (errored && !briefing) return null;

  if (loading && !briefing) {
    return (
      <LinearGradient colors={['#1A1A26', '#12121A']} style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="sparkles" size={16} color={COLORS.primary} />
        </View>
        <Animated.View style={{ flex: 1, opacity: pulse }}>
          <View style={[styles.skeletonLine, { width: '90%' }]} />
          <View style={[styles.skeletonLine, { width: '60%' }]} />
        </Animated.View>
      </LinearGradient>
    );
  }

  if (!briefing) return null;

  return (
    <>
      <TouchableOpacity activeOpacity={0.85} onPress={() => setExpanded(true)}>
        <LinearGradient colors={['#1A1A26', '#12121A']} style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="sparkles" size={16} color={COLORS.primary} />
          </View>
          <Text style={styles.text} numberOfLines={3}>{briefing.text}</Text>
        </LinearGradient>
      </TouchableOpacity>

      <Modal visible={expanded} transparent animationType="fade" onRequestClose={() => setExpanded(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setExpanded(false)}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="sparkles" size={18} color={COLORS.primary} />
                <Text style={styles.modalTitle}>Your briefing</Text>
              </View>
              <TouchableOpacity onPress={() => setExpanded(false)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalText}>{briefing.text}</Text>
            <Text style={styles.modalMeta}>Updated {new Date(briefing.generatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
