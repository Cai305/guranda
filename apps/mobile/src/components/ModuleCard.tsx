import React from 'react';
import { Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { LifeModule } from '../config/modules';
import ConstructionBadge from './ConstructionBadge';

// Small badge shown on installable module cards
function InstallBadge() {
  return (
    <View style={installBadgeStyles.badge}>
      <Ionicons name="cloud-download-outline" size={10} color="#fff" />
      <Text style={installBadgeStyles.text}>INSTALL</Text>
    </View>
  );
}
const installBadgeStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

const installedBadgeStyles = StyleSheet.create({
  badge: {
    backgroundColor: 'rgba(16,185,129,0.2)',
    borderRadius: 8,
    padding: 2,
  },
});

// Shown on modules the admin dashboard has restricted to verified accounts
function VerifyBadge() {
  return (
    <View style={verifyBadgeStyles.badge}>
      <Ionicons name="shield-checkmark-outline" size={10} color="#fff" />
      <Text style={verifyBadgeStyles.text}>VERIFY</Text>
    </View>
  );
}
const verifyBadgeStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F59E0B',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

interface Props {
  module: LifeModule;
  onPress: (module: LifeModule) => void;
  size?: 'grid' | 'wide';
  installed?: boolean;
}

export default function ModuleCard({ module, onPress, size = 'grid', installed = false }: Props) {
  const { theme } = useTheme();
  const { COLORS } = theme;

  const locked = module.status === 'construction' || module.status === 'locked';
  const needsVerification = module.status === 'locked';
  const installable = module.status === 'installable' && !installed;

  const styles = useThemedStyles(({ COLORS, RADIUS }) => ({
    wrapper: {
      width: '48%',
    },
    wide: {
      width: 200,
    },
    card: {
      borderRadius: RADIUS.lg,
      padding: 14,
      height: 110,
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
    },
    cardInstallable: {
      borderColor: '#10B981',
      borderWidth: 1.5,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.18)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconWrapLocked: {
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    name: {
      color: COLORS.text,
      fontSize: 15,
      fontWeight: '700',
    },
    tagline: {
      color: 'rgba(255,255,255,0.75)',
      fontSize: 11,
      marginTop: 2,
    },
  }));

  return (
    <TouchableOpacity
      style={[styles.wrapper, size === 'wide' && styles.wide]}
      activeOpacity={0.8}
      onPress={() => onPress(module)}
    >
      <LinearGradient
        colors={locked ? [COLORS.surfaceElevated, COLORS.surface] : module.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, installable && styles.cardInstallable]}
      >
        <View style={styles.topRow}>
          <View style={[styles.iconWrap, locked && styles.iconWrapLocked]}>
            <Ionicons
              name={module.icon as any}
              size={22}
              color={locked ? module.gradient[0] : '#FFF'}
            />
          </View>
          {needsVerification && <VerifyBadge />}
          {module.status === 'construction' && <ConstructionBadge compact />}
          {installable && <InstallBadge />}
          {installed && (
            <View style={installedBadgeStyles.badge}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            </View>
          )}
        </View>
        <View>
          <Text style={styles.name} numberOfLines={1}>{module.name}</Text>
          <Text style={[styles.tagline, locked && { color: COLORS.textMuted }]} numberOfLines={1}>
            {module.tagline}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}
