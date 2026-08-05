import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { ThemeTokens } from '../../theme/themes';

function ThemePreviewCard({ item, selected, onPress }: { item: ThemeTokens; selected: boolean; onPress: () => void }) {
  const styles = useThemedStyles(theme => ({
    card: {
      backgroundColor: item.COLORS.surface,
      borderWidth: selected ? 2 : 1,
      borderColor: selected ? item.COLORS.primary : item.COLORS.border,
      borderRadius: item.RADIUS.lg,
      padding: theme.SPACING.md,
      marginBottom: theme.SPACING.md,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    swatchRow: {
      flexDirection: 'row',
      gap: 8,
    },
    swatch: {
      width: 28,
      height: 28,
      borderRadius: item.RADIUS.sm,
      borderWidth: 1,
      borderColor: item.COLORS.border,
    },
    radiusDemo: {
      width: 28,
      height: 28,
      borderRadius: item.RADIUS.pill > 100 ? 14 : item.RADIUS.pill,
      backgroundColor: item.COLORS.background,
      borderWidth: 1,
      borderColor: item.COLORS.border,
    },
    checkCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: item.COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    name: {
      ...item.TYPOGRAPHY.h4,
      marginTop: theme.SPACING.sm,
    },
    description: {
      ...item.TYPOGRAPHY.body2,
      marginTop: 4,
    },
  }));

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.topRow}>
        <View style={styles.swatchRow}>
          <View style={[styles.swatch, { backgroundColor: item.COLORS.primary }]} />
          <View style={[styles.swatch, { backgroundColor: item.COLORS.secondary }]} />
          <View style={[styles.swatch, { backgroundColor: item.COLORS.accent }]} />
          <View style={styles.radiusDemo} />
        </View>
        {selected ? (
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={16} color={item.COLORS.background} />
          </View>
        ) : null}
      </View>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </TouchableOpacity>
  );
}

export default function AppearanceScreen({ navigation }: any) {
  const { theme, themeId, setThemeId, availableThemes, isReady } = useTheme();
  const styles = useThemedStyles(t => ({
    container: { flex: 1, backgroundColor: t.COLORS.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: t.SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: t.COLORS.border,
    },
    headerTitle: { ...t.TYPOGRAPHY.h2 },
    content: { padding: t.SPACING.lg },
    sectionTitle: {
      ...t.TYPOGRAPHY.label,
      marginBottom: t.SPACING.sm,
      marginTop: t.SPACING.md,
    },
  }));

  if (!isReady) {
    return <View style={styles.container} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={theme.COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Theme</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Choose a theme</Text>
        {availableThemes.map(item => (
          <ThemePreviewCard
            key={item.id}
            item={item}
            selected={item.id === themeId}
            onPress={() => setThemeId(item.id)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
