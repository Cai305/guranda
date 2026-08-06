import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { TextLayerData } from '../types';
import SimpleSlider from '../SimpleSlider';

const COLORS_SWATCHES = ['#FFFFFF', '#07070C', '#F87171', '#FBBF24', '#34D399', '#22D3EE', '#8B5CF6', '#F472B6'];
const FONTS: { key: TextLayerData['fontFamily']; label: string }[] = [
  { key: 'sans', label: 'Sans' },
  { key: 'serif', label: 'Serif' },
  { key: 'mono', label: 'Mono' },
  { key: 'bold', label: 'Bold' },
];
const ALIGNS: { key: TextLayerData['align']; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'left', icon: 'text' },
  { key: 'center', icon: 'text' },
  { key: 'right', icon: 'text' },
];

type Props = {
  visible: boolean;
  initial?: TextLayerData;
  onCancel: () => void;
  onSave: (data: TextLayerData) => void;
};

export default function TextEditorModal({ visible, initial, onCancel, onSave }: Props) {
  const { theme } = useTheme();
  const [text, setText] = useState(initial?.text ?? '');
  const [color, setColor] = useState(initial?.color ?? '#FFFFFF');
  const [fontSize, setFontSize] = useState(initial?.fontSize ?? 28);
  const [fontFamily, setFontFamily] = useState<TextLayerData['fontFamily']>(initial?.fontFamily ?? 'sans');
  const [align, setAlign] = useState<TextLayerData['align']>(initial?.align ?? 'center');

  React.useEffect(() => {
    if (visible) {
      setText(initial?.text ?? '');
      setColor(initial?.color ?? '#FFFFFF');
      setFontSize(initial?.fontSize ?? 28);
      setFontFamily(initial?.fontFamily ?? 'sans');
      setAlign(initial?.align ?? 'center');
    }
  }, [visible, initial]);

  const save = () => {
    if (!text.trim()) { onCancel(); return; }
    onSave({ kind: 'text', text: text.trim(), color, fontSize, fontFamily, align });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.COLORS.surface }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onCancel}><Text style={{ color: theme.COLORS.textMuted, fontWeight: '600' }}>Cancel</Text></TouchableOpacity>
            <Text style={{ color: theme.COLORS.text, fontWeight: '700' }}>Text</Text>
            <TouchableOpacity onPress={save}><Text style={{ color: theme.COLORS.primary, fontWeight: '700' }}>Done</Text></TouchableOpacity>
          </View>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type something…"
            placeholderTextColor={theme.COLORS.textMuted}
            multiline
            autoFocus
            style={[styles.input, { color, textAlign: align, fontSize: Math.min(fontSize, 34), backgroundColor: theme.COLORS.surfaceElevated }]}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {COLORS_SWATCHES.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setColor(c)}
                style={[styles.colorDot, { backgroundColor: c, borderColor: c === color ? theme.COLORS.primary : theme.COLORS.border }]}
              />
            ))}
          </ScrollView>

          <View style={styles.row}>
            {FONTS.map((f) => (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFontFamily(f.key)}
                style={[
                  styles.pill,
                  { borderColor: fontFamily === f.key ? theme.COLORS.primary : theme.COLORS.border },
                ]}
              >
                <Text style={{ color: fontFamily === f.key ? theme.COLORS.primary : theme.COLORS.textMuted, fontWeight: '600', fontSize: 12 }}>{f.label}</Text>
              </TouchableOpacity>
            ))}
            {ALIGNS.map((a) => (
              <TouchableOpacity
                key={a.key}
                onPress={() => setAlign(a.key)}
                style={[
                  styles.pill,
                  { borderColor: align === a.key ? theme.COLORS.primary : theme.COLORS.border },
                ]}
              >
                <Ionicons
                  name={a.key === 'left' ? 'return-down-back-outline' : a.key === 'right' ? 'return-down-forward-outline' : 'remove-outline'}
                  size={14}
                  color={align === a.key ? theme.COLORS.primary : theme.COLORS.textMuted}
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.sliderRow]}>
            <Text style={{ color: theme.COLORS.textMuted, fontSize: 12, width: 32 }}>{Math.round(fontSize)}</Text>
            <View style={{ flex: 1 }}>
              <SimpleSlider value={fontSize} min={12} max={64} onChange={setFontSize} />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: { minHeight: 70, borderRadius: 12, padding: 14, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  colorDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
