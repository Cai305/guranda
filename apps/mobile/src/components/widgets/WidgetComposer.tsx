import React, { useState } from 'react';
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { PlatformWidgetData, PlatformWidgetType } from './platformWidget';

const types: { type: PlatformWidgetType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'product', label: 'Product', icon: 'bag-handle' }, { type: 'flight', label: 'Flight', icon: 'airplane' },
  { type: 'carHire', label: 'Car hire', icon: 'car-sport' }, { type: 'hotel', label: 'Hotel', icon: 'bed' },
  { type: 'event', label: 'Event', icon: 'calendar' }, { type: 'itinerary', label: 'Itinerary', icon: 'map' },
  { type: 'game', label: 'Game', icon: 'game-controller' }, { type: 'miniApp', label: 'Mini app', icon: 'apps' },
  { type: 'health', label: 'Health', icon: 'heart' }, { type: 'challenge', label: 'Challenge', icon: 'trophy' },
  { type: 'post', label: 'Post', icon: 'chatbox-ellipses' }, { type: 'service', label: 'Service', icon: 'sparkles' },
];

export default function WidgetComposer({ visible, onClose, onSend }: { visible: boolean; onClose: () => void; onSend: (widget: PlatformWidgetData) => void }) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const [type, setType] = useState<PlatformWidgetType>('product');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [priceLabel, setPriceLabel] = useState('');
  const selected = types.find(x => x.type === type)!;
  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }, sheet: { maxHeight: '82%', padding: SPACING.lg, backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md }, title: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
    typeRow: { gap: 8, paddingBottom: SPACING.md }, type: { minWidth: 80, padding: 9, alignItems: 'center', gap: 3, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border }, active: { borderColor: COLORS.primary, backgroundColor: 'rgba(0,255,255,0.1)' }, typeText: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700' },
    input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, color: COLORS.text, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 9 }, send: { marginTop: 5, padding: 13, alignItems: 'center', borderRadius: RADIUS.md, backgroundColor: COLORS.primary }, sendText: { color: '#fff', fontWeight: '800' }, hint: { color: COLORS.textMuted, fontSize: 12, marginBottom: 10 },
  }));
  const send = () => {
    if (!title.trim()) return;
    onSend({ type, title: title.trim(), subtitle: subtitle.trim() || undefined, priceLabel: priceLabel.trim() || undefined, badge: selected.label, action: { label: type === 'flight' || type === 'hotel' || type === 'carHire' ? 'View booking' : 'Open' } });
    setTitle(''); setSubtitle(''); setPriceLabel(''); onClose();
  };
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.overlay}><View style={styles.sheet}>
    <View style={styles.header}><Text style={styles.title}>Share a widget</Text><TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={COLORS.text} /></TouchableOpacity></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>{types.map(item => <TouchableOpacity key={item.type} onPress={() => setType(item.type)} style={[styles.type, type === item.type && styles.active]}><Ionicons name={item.icon} size={19} color={type === item.type ? COLORS.primary : COLORS.textMuted} /><Text style={styles.typeText}>{item.label}</Text></TouchableOpacity>)}</ScrollView>
    <Text style={styles.hint}>Create a {selected.label.toLowerCase()} card that can be read by people and AI assistants.</Text>
    <TextInput value={title} onChangeText={setTitle} placeholder={`${selected.label} title`} placeholderTextColor={COLORS.textMuted} style={styles.input} />
    <TextInput value={subtitle} onChangeText={setSubtitle} placeholder="Details, location or provider (optional)" placeholderTextColor={COLORS.textMuted} style={styles.input} />
    <TextInput value={priceLabel} onChangeText={setPriceLabel} placeholder="Price, reward or status (optional)" placeholderTextColor={COLORS.textMuted} style={styles.input} />
    <TouchableOpacity disabled={!title.trim()} onPress={send} style={[styles.send, !title.trim() && { opacity: 0.45 }]}><Text style={styles.sendText}>Send {selected.label} widget</Text></TouchableOpacity>
  </View></View></Modal>;
}
