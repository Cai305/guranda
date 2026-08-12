import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import TrendingStoriesFeed from '../components/TrendingStoriesFeed';

// Stories moved here from Explore's old "Trending" tab (now a real momentum
// feed) — this screen is a thin wrapper so the Stories experience itself
// (TrendingStoriesFeed) stays completely untouched, just relocated.
export default function StoriesScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { TYPOGRAPHY } = theme;
  const styles = useThemedStyles(({ COLORS, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      gap: SPACING.md,
    },
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Stories</Text>
      </View>
      <TrendingStoriesFeed navigation={navigation} />
    </SafeAreaView>
  );
}
