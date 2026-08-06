import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { CATEGORIES, POSTER_TEMPLATES, TemplateCategory } from './posterTemplates';
import { ASPECT_RATIOS, AspectRatioId, Layer, makeLayer, makeTransform, newLayerId } from './types';
import { resolveFontFamily } from './fonts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

export default function PosterCreatorScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [aspectId, setAspectId] = useState<AspectRatioId>('portrait');
  const [category, setCategory] = useState<TemplateCategory | 'all'>('all');

  const aspect = ASPECT_RATIOS.find((a) => a.id === aspectId) ?? ASPECT_RATIOS[2];
  const cardHeight = CARD_WIDTH / aspect.ratio;
  const canvasWidth = SCREEN_WIDTH - 32;
  const canvasHeight = canvasWidth / aspect.ratio;

  const templates = useMemo(
    () => (category === 'all' ? POSTER_TEMPLATES : POSTER_TEMPLATES.filter((tpl) => tpl.category === category)),
    [category],
  );

  const openBlank = () => {
    navigation.navigate('MediaEditor', {
      mode: 'poster',
      aspectRatio: aspect.ratio,
      initialGradient: null,
      initialLayers: [],
      templateCategory: 'poster',
    });
  };

  const openTemplate = (templateId: string) => {
    const template = POSTER_TEMPLATES.find((tpl) => tpl.id === templateId);
    if (!template) return;

    const shapeLayers: Layer[] = (template.shapes ?? []).map((sh) =>
      makeLayer(
        newLayerId(),
        {
          kind: 'shape',
          shapeType: sh.shapeType,
          color: sh.color,
          width: sh.widthPct * canvasWidth,
          height: sh.heightPct * canvasHeight,
          cornerRadius: sh.cornerRadius,
        },
        makeTransform(sh.xPct * canvasWidth, sh.yPct * canvasHeight),
      ),
    );

    const textLayers: Layer[] = template.texts.map((tx) =>
      makeLayer(
        newLayerId(),
        {
          kind: 'text',
          text: tx.text,
          color: tx.color,
          fontSize: tx.fontSize,
          fontFamily: tx.fontFamily,
          bold: tx.bold,
          align: tx.align,
          backgroundColor: tx.backgroundColor ?? null,
        },
        makeTransform(tx.xPct * canvasWidth, tx.yPct * canvasHeight),
      ),
    );

    navigation.navigate('MediaEditor', {
      mode: 'poster',
      aspectRatio: aspect.ratio,
      initialGradient: template.gradient,
      initialLayers: [...shapeLayers, ...textLayers],
      templateCategory: template.category,
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.COLORS.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={theme.COLORS.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.COLORS.text }]}>Create a Poster</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.aspectRow}>
        {ASPECT_RATIOS.map((a) => {
          const active = a.id === aspectId;
          return (
            <TouchableOpacity
              key={a.id}
              onPress={() => setAspectId(a.id)}
              style={[styles.aspectChip, { backgroundColor: active ? theme.COLORS.primary : theme.COLORS.surfaceElevated }]}
            >
              <Ionicons name={a.icon} size={15} color={active ? '#fff' : theme.COLORS.textMuted} />
              <Text style={{ color: active ? '#fff' : theme.COLORS.textMuted, fontWeight: '700', fontSize: 12 }}>{a.label}</Text>
              <Text style={{ color: active ? 'rgba(255,255,255,0.75)' : theme.COLORS.textMuted, fontSize: 10 }}>{a.sublabel}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
        {[{ key: 'all' as const, label: 'All' }, ...CATEGORIES].map((c) => {
          const active = c.key === category;
          return (
            <TouchableOpacity
              key={c.key}
              onPress={() => setCategory(c.key)}
              style={[styles.categoryPill, { borderColor: active ? theme.COLORS.primary : theme.COLORS.border }]}
            >
              <Text style={{ color: active ? theme.COLORS.primary : theme.COLORS.textMuted, fontWeight: '600', fontSize: 12 }}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={openBlank} style={[styles.card, { width: CARD_WIDTH, height: cardHeight, borderColor: theme.COLORS.border }]}>
          <View style={[StyleSheet.absoluteFill, styles.blankCard, { backgroundColor: theme.COLORS.surfaceElevated }]}>
            <Ionicons name="add-circle-outline" size={32} color={theme.COLORS.primary} />
            <Text style={[styles.blankLabel, { color: theme.COLORS.text }]}>Blank Canvas</Text>
          </View>
        </TouchableOpacity>

        {templates.map((tpl) => {
          const previewScale = CARD_WIDTH / canvasWidth;
          return (
            <TouchableOpacity key={tpl.id} onPress={() => openTemplate(tpl.id)} style={[styles.card, { width: CARD_WIDTH, height: cardHeight }]}>
              <LinearGradient colors={tpl.gradient} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                {(tpl.shapes ?? []).map((sh, i) => {
                  const w = sh.widthPct * CARD_WIDTH;
                  const h = sh.heightPct * cardHeight;
                  const radius = sh.shapeType === 'circle' ? Math.max(w, h) / 2 : sh.cornerRadius ? sh.cornerRadius * previewScale : 0;
                  return (
                    <View
                      key={i}
                      style={{
                        position: 'absolute',
                        left: sh.xPct * CARD_WIDTH - w / 2,
                        top: sh.yPct * cardHeight - h / 2,
                        width: sh.shapeType === 'line' ? w : w,
                        height: sh.shapeType === 'line' ? Math.max(1, h) : h,
                        backgroundColor: sh.color,
                        borderRadius: radius,
                      }}
                    />
                  );
                })}
                {tpl.texts.map((l, i) => (
                  <Text
                    key={i}
                    numberOfLines={3}
                    style={{
                      position: 'absolute',
                      top: l.yPct * cardHeight - 8,
                      width: CARD_WIDTH * 0.86,
                      left: CARD_WIDTH * 0.07,
                      textAlign: l.align,
                      color: l.color,
                      fontFamily: resolveFontFamily(l.fontFamily, l.bold),
                      fontSize: Math.max(8, l.fontSize * previewScale),
                    }}
                  >
                    {l.text}
                  </Text>
                ))}
              </LinearGradient>
              <Text style={[styles.cardLabel, { color: '#fff' }]}>{tpl.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { padding: 4 },
  title: { fontSize: 17, fontWeight: '700' },
  aspectRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 10 },
  aspectChip: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, gap: 1, minWidth: 66 },
  categoryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  categoryPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, padding: 16, paddingTop: 4 },
  card: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  blankCard: { justifyContent: 'center', alignItems: 'center', gap: 8 },
  blankLabel: { fontSize: 13, fontWeight: '700' },
  cardLabel: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
});
