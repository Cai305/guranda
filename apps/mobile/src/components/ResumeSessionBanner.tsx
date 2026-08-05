import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useActiveSession } from '../context/ActiveSessionContext';

export default function ResumeSessionBanner({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const { session, dismiss } = useActiveSession();

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, RADIUS, SPACING }) => ({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: SPACING.lg,
      marginBottom: SPACING.md,
    },
    tap: { flex: 1, borderRadius: RADIUS.pill, overflow: 'hidden' },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    text: { ...TYPOGRAPHY.body2, color: '#fff', fontWeight: '700', flex: 1 },
    dismissBtn: {
      width: 32, height: 32, borderRadius: RADIUS.pill,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      justifyContent: 'center', alignItems: 'center',
    },
  }));

  if (!session) return null;

  const resume = () => navigation.navigate(session.route.name, session.route.params);

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.tap} activeOpacity={0.85} onPress={resume}>
        <LinearGradient
          colors={session.gradient ?? ['#7C3AED', '#4F46E5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.pill}
        >
          <Ionicons name={session.icon as any} size={20} color="#fff" />
          <Text style={styles.text} numberOfLines={1}>Resume {session.label}</Text>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.85)" />
        </LinearGradient>
      </TouchableOpacity>
      <TouchableOpacity style={styles.dismissBtn} onPress={dismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="close" size={16} color={COLORS.textMuted} />
      </TouchableOpacity>
    </View>
  );
}
