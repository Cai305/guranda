import React from 'react';
import { Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../theme';
import { LiveCategory } from '../config/liveCategories';
import ConstructionBadge from './ConstructionBadge';

interface Props {
  category: LiveCategory;
  onPress: (category: LiveCategory) => void;
}

export default function LiveCategoryCard({ category, onPress }: Props) {
  const locked = category.status === 'construction';

  return (
    <TouchableOpacity style={styles.wrapper} activeOpacity={0.8} onPress={() => onPress(category)}>
      <LinearGradient
        colors={locked ? [COLORS.surfaceElevated, COLORS.surface] : category.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.topRow}>
          <View style={[styles.iconWrap, locked && styles.iconWrapLocked]}>
            <Ionicons name={category.icon as any} size={20} color={locked ? category.gradient[0] : '#FFF'} />
          </View>
          {locked && <ConstructionBadge compact />}
        </View>
        <View>
          <Text style={styles.name} numberOfLines={1}>{category.name}</Text>
          <Text style={[styles.tagline, locked && { color: COLORS.textMuted }]} numberOfLines={1}>
            {category.tagline}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 150,
  },
  card: {
    borderRadius: RADIUS.lg,
    padding: 14,
    height: 100,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapLocked: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  name: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  tagline: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    marginTop: 2,
  },
});
