import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../context/ThemeContext';

export interface CompanionData {
  name: string;
  stage: number;
  xp: number;
  xpIntoStage: number;
  xpForNextStage: number | null;
}

const STAGE_META: { icon: keyof typeof Ionicons.glyphMap; title: string; gradient: string }[] = [
  { icon: 'egg-outline', title: 'Hatchling', gradient: 'card' },
  { icon: 'leaf-outline', title: 'Sprout', gradient: 'emerald' },
  { icon: 'flame-outline', title: 'Spark', gradient: 'sunset' },
  { icon: 'star-outline', title: 'Riser', gradient: 'ocean' },
  { icon: 'shield-outline', title: 'Guardian', gradient: 'aurora' },
  { icon: 'trophy', title: 'Legend', gradient: 'golden' },
];

export default function CompanionCard({
  data,
  onRename,
}: {
  data: CompanionData;
  onRename: (name: string) => Promise<void>;
}) {
  const { theme } = useTheme();
  const { GRADIENTS } = theme;
  const [modalVisible, setModalVisible] = useState(false);
  const [draftName, setDraftName] = useState(data.name);
  const [saving, setSaving] = useState(false);

  const meta = STAGE_META[Math.min(data.stage, STAGE_META.length - 1)];
  const progress =
    data.xpForNextStage !== null
      ? data.xpIntoStage / (data.xpIntoStage + data.xpForNextStage)
      : 1;

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, RADIUS, SPACING }) => ({
    card: {
      marginHorizontal: SPACING.lg,
      marginTop: SPACING.md,
      borderRadius: RADIUS.lg,
      padding: SPACING.md,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
    },
    iconWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: 'rgba(255,255,255,0.15)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    info: { flex: 1, marginLeft: SPACING.md },
    nameRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
    name: { ...TYPOGRAPHY.body1, fontWeight: '700' as const },
    stageTitle: { ...TYPOGRAPHY.caption, fontSize: 11, marginTop: 2 },
    progressTrack: {
      height: 4,
      borderRadius: 2,
      backgroundColor: 'rgba(255,255,255,0.2)',
      marginTop: 8,
      overflow: 'hidden' as const,
    },
    progressFill: { height: 4, borderRadius: 2, backgroundColor: '#FFFFFF' },
    xpText: { ...TYPOGRAPHY.caption, fontSize: 10, marginTop: 4 },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center' as const,
      padding: SPACING.lg,
    },
    modalContent: {
      backgroundColor: COLORS.surfaceElevated,
      borderRadius: RADIUS.lg,
      padding: SPACING.lg,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
    },
    modalTitle: { ...TYPOGRAPHY.h3, marginBottom: SPACING.md },
    input: {
      backgroundColor: COLORS.surface,
      color: COLORS.text,
      padding: 12,
      borderRadius: RADIUS.sm,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    modalActions: { flexDirection: 'row' as const, gap: SPACING.sm, marginTop: SPACING.lg },
    modalBtn: {
      flex: 1,
      padding: 12,
      borderRadius: RADIUS.sm,
      alignItems: 'center' as const,
    },
    cancelBtn: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    saveBtn: { backgroundColor: COLORS.primary },
    cancelBtnText: { color: COLORS.textMuted, fontWeight: '600' as const },
    saveBtnText: { color: '#FFF', fontWeight: '700' as const },
  }));

  const submit = async () => {
    const trimmed = draftName.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await onRename(trimmed);
      setModalVisible(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          setDraftName(data.name);
          setModalVisible(true);
        }}
      >
        <LinearGradient
          colors={GRADIENTS[meta.gradient] ?? GRADIENTS.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.iconWrap}>
            <Ionicons name={meta.icon} size={26} color="#FFFFFF" />
          </View>
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{data.name}</Text>
              <Ionicons name="pencil" size={12} color="rgba(255,255,255,0.6)" />
            </View>
            <Text style={styles.stageTitle}>
              {meta.title} · Stage {data.stage}/5
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }]} />
            </View>
            <Text style={styles.xpText}>
              {data.xpForNextStage !== null
                ? `${data.xpForNextStage} XP to next stage`
                : 'Max stage reached'}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Name your companion</Text>
            <TextInput
              style={styles.input}
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Companion name"
              placeholderTextColor="#7A7A8A"
              maxLength={24}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={submit} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
