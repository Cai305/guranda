import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { TextLayerData } from '../types';
import { FONT_OPTIONS, resolveFontFamily } from '../fonts';
import SimpleSlider from '../SimpleSlider';
import { fetchApi } from '../../../utils/api';

const COLORS_SWATCHES = ['#FFFFFF', '#07070C', '#F87171', '#FBBF24', '#34D399', '#22D3EE', '#8B5CF6', '#F472B6'];
const BG_SWATCHES: (string | null)[] = [null, '#00000080', '#FFFFFFCC', '#8B5CF6E6'];
const ALIGNS: { key: TextLayerData['align']; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'left', icon: 'return-down-back-outline' },
  { key: 'center', icon: 'remove-outline' },
  { key: 'right', icon: 'return-down-forward-outline' },
];

type Props = {
  visible: boolean;
  initial?: TextLayerData;
  /** Poster category / theme, used to steer AI copy suggestions */
  suggestContext?: string;
  onCancel: () => void;
  onSave: (data: TextLayerData) => void;
};

export default function TextEditorModal({ visible, initial, suggestContext, onCancel, onSave }: Props) {
  const { theme } = useTheme();
  const [text, setText] = useState(initial?.text ?? '');
  const [color, setColor] = useState(initial?.color ?? '#FFFFFF');
  const [fontSize, setFontSize] = useState(initial?.fontSize ?? 28);
  const [fontFamily, setFontFamily] = useState<TextLayerData['fontFamily']>(initial?.fontFamily ?? 'inter');
  const [bold, setBold] = useState(initial?.bold ?? true);
  const [align, setAlign] = useState<TextLayerData['align']>(initial?.align ?? 'center');
  const [backgroundColor, setBackgroundColor] = useState<string | null>(initial?.backgroundColor ?? null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  React.useEffect(() => {
    if (visible) {
      setText(initial?.text ?? '');
      setColor(initial?.color ?? '#FFFFFF');
      setFontSize(initial?.fontSize ?? 28);
      setFontFamily(initial?.fontFamily ?? 'inter');
      setBold(initial?.bold ?? true);
      setAlign(initial?.align ?? 'center');
      setBackgroundColor(initial?.backgroundColor ?? null);
      setSuggestions([]);
    }
  }, [visible, initial]);

  const save = () => {
    if (!text.trim()) { onCancel(); return; }
    onSave({ kind: 'text', text: text.trim(), color, fontSize, fontFamily, bold, align, backgroundColor });
  };

  const requestSuggestions = async () => {
    setSuggesting(true);
    setSuggestions([]);
    try {
      const res = await fetchApi('/editor/suggest-copy', {
        method: 'POST',
        body: JSON.stringify({ currentText: text, context: suggestContext }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.suggestions)) setSuggestions(data.suggestions.slice(0, 3));
      }
    } catch {
      // silent — AI assist is a nicety, never blocks editing
    } finally {
      setSuggesting(false);
    }
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

          <View style={styles.inputRow}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Type something…"
              placeholderTextColor={theme.COLORS.textMuted}
              multiline
              autoFocus
              style={[
                styles.input,
                {
                  color,
                  textAlign: align,
                  fontSize: Math.min(fontSize, 34),
                  fontFamily: resolveFontFamily(fontFamily, bold),
                  backgroundColor: backgroundColor ?? theme.COLORS.surfaceElevated,
                },
              ]}
            />
            <TouchableOpacity onPress={requestSuggestions} disabled={suggesting} style={[styles.aiBtn, { backgroundColor: theme.COLORS.primary }]}>
              {suggesting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="sparkles" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>

          {suggestions.length > 0 && (
            <View style={styles.suggestWrap}>
              {suggestions.map((s, i) => (
                <TouchableOpacity key={i} onPress={() => { setText(s); setSuggestions([]); }} style={[styles.suggestChip, { borderColor: theme.COLORS.border }]}>
                  <Text numberOfLines={2} style={{ color: theme.COLORS.text, fontSize: 12 }}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {COLORS_SWATCHES.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setColor(c)}
                style={[styles.colorDot, { backgroundColor: c, borderColor: c === color ? theme.COLORS.primary : theme.COLORS.border }]}
              />
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {FONT_OPTIONS.map((f) => (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFontFamily(f.key)}
                style={[styles.pill, { borderColor: fontFamily === f.key ? theme.COLORS.primary : theme.COLORS.border }]}
              >
                <Text style={{ color: fontFamily === f.key ? theme.COLORS.primary : theme.COLORS.textMuted, fontWeight: '600', fontSize: 12, fontFamily: f.regular }}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.row}>
            <TouchableOpacity
              onPress={() => setBold((b) => !b)}
              style={[styles.pill, { borderColor: bold ? theme.COLORS.primary : theme.COLORS.border }]}
            >
              <Text style={{ color: bold ? theme.COLORS.primary : theme.COLORS.textMuted, fontWeight: '800', fontSize: 12 }}>B</Text>
            </TouchableOpacity>
            {ALIGNS.map((a) => (
              <TouchableOpacity
                key={a.key}
                onPress={() => setAlign(a.key)}
                style={[styles.pill, { borderColor: align === a.key ? theme.COLORS.primary : theme.COLORS.border }]}
              >
                <Ionicons name={a.icon} size={14} color={align === a.key ? theme.COLORS.primary : theme.COLORS.textMuted} />
              </TouchableOpacity>
            ))}
            <View style={styles.bgDivider} />
            {BG_SWATCHES.map((bg, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setBackgroundColor(bg)}
                style={[
                  styles.bgSwatch,
                  { backgroundColor: bg ?? 'transparent', borderColor: backgroundColor === bg ? theme.COLORS.primary : theme.COLORS.border },
                ]}
              >
                {bg === null && <Ionicons name="close" size={12} color={theme.COLORS.textMuted} />}
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.sliderRow]}>
            <Text style={{ color: theme.COLORS.textMuted, fontSize: 12, width: 32 }}>{Math.round(fontSize)}</Text>
            <View style={{ flex: 1 }}>
              <SimpleSlider value={fontSize} min={12} max={72} onChange={setFontSize} />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  input: { flex: 1, minHeight: 70, borderRadius: 12, padding: 14 },
  aiBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  suggestWrap: { gap: 6 },
  suggestChip: { borderWidth: 1, borderRadius: 10, padding: 10 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  colorDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5 },
  bgDivider: { width: 1, height: 20, backgroundColor: 'rgba(128,128,128,0.3)' },
  bgSwatch: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
