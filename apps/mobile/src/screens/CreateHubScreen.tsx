import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { usePressScale } from '../theme/motion';

const AnimatedCard = Animated.createAnimatedComponent(TouchableOpacity);

function CreateOptionCard({ opt, style, iconWrapStyle, titleStyle, hintStyle, chevronColor, onPress }: {
  opt: typeof OPTIONS[number];
  style: any; iconWrapStyle: any; titleStyle: any; hintStyle: any; chevronColor: string;
  onPress: () => void;
}) {
  const { style: pressStyle, onPressIn, onPressOut } = usePressScale();
  return (
    <AnimatedCard style={[style, pressStyle]} activeOpacity={0.9} onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress}>
      <View style={[iconWrapStyle, { backgroundColor: `${opt.color}22` }]}>
        <Ionicons name={opt.icon as any} size={24} color={opt.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={titleStyle}>{opt.title}</Text>
        <Text style={hintStyle}>{opt.hint}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={chevronColor} />
    </AnimatedCard>
  );
}

const OPTIONS = [
  { key: 'video', icon: 'videocam', color: '#EC4899', title: 'New video', hint: 'Record or upload clips, then trim, filter, add text & music', route: 'MultiClipCapture' },
  { key: 'templates', icon: 'grid', color: '#6366F1', title: 'Templates', hint: 'Start from a ready-made filter + music combo', route: 'Templates' },
  { key: 'sync', icon: 'mic', color: '#8B5CF6', title: 'Lip Sync', hint: 'Pick a song and perform to it', route: 'CreateLipSync' },
] as const;

// The TikTok-style "Create" hub: every way to start something new lives
// here, one tap away from Explore's create button. Each tile hands off to
// its own already-built flow rather than duplicating logic.
export default function CreateHubScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
    card: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: SPACING.lg, marginTop: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: 16 },
    iconWrap: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
    cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
    cardHint: { fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
    draftsLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 28 },
    draftsLinkText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create</Text>
        <View style={{ width: 40 }} />
      </View>

      {OPTIONS.map((opt) => (
        <CreateOptionCard key={opt.key} opt={opt} style={styles.card} iconWrapStyle={styles.iconWrap} titleStyle={styles.cardTitle} hintStyle={styles.cardHint} chevronColor={COLORS.textMuted} onPress={() => navigation.navigate(opt.route)} />
      ))}

      <TouchableOpacity style={styles.draftsLink} onPress={() => navigation.navigate('PerformanceDrafts')}>
        <Ionicons name="albums-outline" size={16} color={COLORS.primary} />
        <Text style={styles.draftsLinkText}>My Drafts</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
