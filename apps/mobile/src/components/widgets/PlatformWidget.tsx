import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { PlatformWidgetData, PlatformWidgetType } from './platformWidget';

const presentation: Record<PlatformWidgetType, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  product: { icon: 'bag-handle', label: 'Product' },
  flight: { icon: 'airplane', label: 'Flight' },
  carHire: { icon: 'car-sport', label: 'Car hire' },
  hotel: { icon: 'bed', label: 'Stay' },
  event: { icon: 'calendar', label: 'Event' },
  itinerary: { icon: 'map', label: 'Itinerary' },
  game: { icon: 'game-controller', label: 'Game' },
  miniApp: { icon: 'apps', label: 'Mini app' },
  health: { icon: 'heart', label: 'Health' },
  challenge: { icon: 'trophy', label: 'Challenge' },
  post: { icon: 'chatbox-ellipses', label: 'Post' },
  property: { icon: 'home', label: 'Property' },
  service: { icon: 'sparkles', label: 'Service' },
};

export default function PlatformWidget({ widget, navigation, compact = false }: { widget: PlatformWidgetData; navigation?: any; compact?: boolean }) {
  const { theme } = useTheme();
  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    card: { overflow: 'hidden', borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.glassBorder, backgroundColor: COLORS.glass, minWidth: compact ? 230 : undefined },
    visual: { height: compact ? 82 : 122, justifyContent: 'center', alignItems: 'center' },
    image: { width: '100%', height: '100%' },
    type: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', gap: 4, alignItems: 'center', borderRadius: RADIUS.pill, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: 'rgba(0,0,0,0.55)' },
    typeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
    info: { padding: SPACING.sm, gap: 3 },
    title: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
    subtitle: { color: COLORS.textMuted, fontSize: 12 },
    price: { color: COLORS.primary, fontSize: 13, fontWeight: '800', marginTop: 2 },
    meta: { color: COLORS.textMuted, fontSize: 11 },
    action: { alignSelf: 'flex-start', marginTop: 5, paddingVertical: 5, paddingHorizontal: 9, backgroundColor: 'rgba(0,255,255,0.12)', borderRadius: RADIUS.pill },
    actionText: { color: COLORS.primary, fontWeight: '800', fontSize: 11 },
  }));
  const spec = presentation[widget.type] || presentation.service;
  const open = () => {
    if (widget.action?.screen && navigation?.navigate) navigation.navigate(widget.action.screen, widget.action.params);
  };
  return (
    <TouchableOpacity disabled={!widget.action?.screen} activeOpacity={0.86} onPress={open} style={styles.card}>
      <View style={styles.visual}>
        {widget.imageUrl ? <Image source={{ uri: widget.imageUrl }} style={styles.image} resizeMode="cover" /> : <LinearGradient colors={theme.GRADIENTS.primary} style={styles.visual}><Ionicons name={spec.icon} size={32} color="rgba(255,255,255,0.65)" /></LinearGradient>}
        <View style={styles.type}><Ionicons name={spec.icon} size={11} color="#fff" /><Text style={styles.typeText}>{widget.badge || spec.label}</Text></View>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{widget.title}</Text>
        {!!widget.subtitle && <Text style={styles.subtitle} numberOfLines={1}>{widget.subtitle}</Text>}
        {!!widget.priceLabel && <Text style={styles.price}>{widget.priceLabel}</Text>}
        {widget.meta?.slice(0, 2).map((line, index) => <Text key={index} style={styles.meta} numberOfLines={1}>{line}</Text>)}
        {!!widget.action?.label && <View style={styles.action}><Text style={styles.actionText}>{widget.action.label}</Text></View>}
      </View>
    </TouchableOpacity>
  );
}
