import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { POSTER_TEMPLATES } from './posterTemplates';
import { Layer, makeTransform, newLayerId } from './types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;
const RATIO = 4 / 5;
const CARD_HEIGHT = CARD_WIDTH / RATIO;

export default function PosterCreatorScreen({ navigation }: any) {
  const { theme } = useTheme();

  const openBlank = () => {
    navigation.navigate('MediaEditor', {
      mode: 'poster',
      aspectRatio: RATIO,
      initialGradient: theme.GRADIENTS?.primary ?? ['#8B5CF6', '#6366F1'],
      initialLayers: [],
    });
  };

  const openTemplate = (templateId: string) => {
    const template = POSTER_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    const canvasWidth = SCREEN_WIDTH - 32;
    const canvasHeight = canvasWidth / RATIO;
    const layers: Layer[] = template.layers.map((l) => ({
      id: newLayerId(),
      data: { kind: 'text', text: l.text, color: l.color, fontSize: l.fontSize, fontFamily: l.fontFamily, align: l.align },
      transform: makeTransform(l.xPct * canvasWidth, l.yPct * canvasHeight),
    }));
    navigation.navigate('MediaEditor', {
      mode: 'poster',
      aspectRatio: RATIO,
      initialGradient: template.gradient,
      initialLayers: layers,
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

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={openBlank} style={[styles.card, { width: CARD_WIDTH, height: CARD_HEIGHT, borderColor: theme.COLORS.border }]}>
          <View style={[StyleSheet.absoluteFill, styles.blankCard, { backgroundColor: theme.COLORS.surfaceElevated }]}>
            <Ionicons name="add-circle-outline" size={32} color={theme.COLORS.primary} />
            <Text style={[styles.blankLabel, { color: theme.COLORS.text }]}>Blank Canvas</Text>
          </View>
        </TouchableOpacity>

        {POSTER_TEMPLATES.map((t) => (
          <TouchableOpacity key={t.id} onPress={() => openTemplate(t.id)} style={[styles.card, { width: CARD_WIDTH, height: CARD_HEIGHT }]}>
            <LinearGradient colors={t.gradient} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              {t.layers.map((l, i) => (
                <Text
                  key={i}
                  numberOfLines={2}
                  style={{
                    position: 'absolute',
                    left: l.align === 'left' ? l.xPct * CARD_WIDTH - CARD_WIDTH * 0.38 : undefined,
                    top: l.yPct * CARD_HEIGHT - 8,
                    width: CARD_WIDTH * 0.8,
                    alignSelf: l.align === 'center' ? 'center' : undefined,
                    textAlign: l.align,
                    color: l.color,
                    fontWeight: l.fontFamily === 'bold' ? '800' : '600',
                    fontSize: Math.max(9, l.fontSize * (CARD_WIDTH / (SCREEN_WIDTH - 32))),
                  }}
                >
                  {l.text}
                </Text>
              ))}
            </LinearGradient>
            <Text style={[styles.cardLabel, { color: theme.COLORS.text }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { padding: 4 },
  title: { fontSize: 17, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, padding: 16 },
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
