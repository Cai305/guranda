import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../context/ThemeContext';

export interface CompanionData {
  name: string;
  stage: number;
  level: string;
  subscribersIntoStage: number;
  subscribersForNextStage: number | null;
}

// One entry per reputation-ladder tier (Nano/Micro/Midtier/Macro/Mega
// Influencer, see reputation.util.ts) — the pet's stage IS your reputation
// level, so this list stays the same length as that ladder.
const STAGE_META: { icon: keyof typeof Ionicons.glyphMap; title: string; gradient: string }[] = [
  { icon: 'egg-outline', title: 'Hatchling', gradient: 'card' },
  { icon: 'leaf-outline', title: 'Sprout', gradient: 'emerald' },
  { icon: 'flame-outline', title: 'Spark', gradient: 'sunset' },
  { icon: 'shield-outline', title: 'Guardian', gradient: 'aurora' },
  { icon: 'trophy', title: 'Legend', gradient: 'golden' },
];

export default function CompanionCard({
  data,
  onRename,
  compact,
}: {
  data: CompanionData;
  onRename: (name: string) => Promise<void>;
  /** Small tappable badge for embedding in the profile header, instead of the full-width row card. */
  compact?: boolean;
}) {
  const { theme } = useTheme();
  const { GRADIENTS } = theme;
  const [modalVisible, setModalVisible] = useState(false);
  const [draftName, setDraftName] = useState(data.name);
  const [saving, setSaving] = useState(false);

  const meta = STAGE_META[Math.min(data.stage, STAGE_META.length - 1)];
  const progress =
    data.subscribersForNextStage !== null
      ? data.subscribersIntoStage / (data.subscribersIntoStage + data.subscribersForNextStage)
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
    // Compact badge — embedded in the profile header in place of the old
    // plain-text level pill, so the pet fills that space instead of a
    // separate card further down the screen.
    compactWrap: { alignItems: 'center' as const, width: 76 },
    compactBadge: {
      width: 52,
      height: 52,
      borderRadius: 26,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.35)',
    },
    compactStage: {
      color: '#FFF',
      fontSize: 10,
      fontWeight: '700' as const,
      marginTop: 4,
      textAlign: 'center' as const,
    },
    compactTrack: {
      width: 44,
      height: 3,
      borderRadius: 2,
      backgroundColor: 'rgba(255,255,255,0.25)',
      marginTop: 4,
      overflow: 'hidden' as const,
    },
    compactFill: { height: 3, borderRadius: 2, backgroundColor: '#FFF' },
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

  const openRenameModal = () => {
    setDraftName(data.name);
    setModalVisible(true);
  };

  const pct = `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` as `${number}%`;

  const renameModal = (
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
  );

  if (compact) {
    return (
      <>
        <TouchableOpacity activeOpacity={0.85} onPress={openRenameModal} style={styles.compactWrap}>
          <LinearGradient
            colors={GRADIENTS[meta.gradient] ?? GRADIENTS.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.compactBadge}
          >
            <Ionicons name={meta.icon} size={22} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.compactStage} numberOfLines={1}>{data.level}</Text>
          <View style={styles.compactTrack}>
            <View style={[styles.compactFill, { width: pct }]} />
          </View>
        </TouchableOpacity>
        {renameModal}
      </>
    );
  }

  return (
    <>
      <TouchableOpacity activeOpacity={0.85} onPress={openRenameModal}>
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
              {meta.title} · {data.level}
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: pct }]} />
            </View>
            <Text style={styles.xpText}>
              {data.subscribersForNextStage !== null
                ? `${data.subscribersForNextStage} to next stage`
                : 'Top tier reached'}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
      {renameModal}
    </>
  );
}
