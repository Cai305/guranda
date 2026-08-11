import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, ScrollView, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi, uploadMedia } from '../../utils/api';
import { CHAT_WALLPAPER_PRESETS, isPresetId } from '../../config/chatWallpapers';

interface Props {
  visible: boolean;
  onClose: () => void;
  // 'global' sets the default applied to every chat ("for everyone");
  // 'chat' overrides just this one conversation ("for an individual").
  scope: 'global' | 'chat';
  chatId?: string;
  currentValue: string | null;
  onSaved: (value: string | null) => void;
}

export default function ChatWallpaperPicker({ visible, onClose, scope, chatId, currentValue, onSaved }: Props) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, RADIUS, SPACING }) => ({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: COLORS.surface,
      borderTopLeftRadius: RADIUS.xl,
      borderTopRightRadius: RADIUS.xl,
      padding: SPACING.lg,
      paddingBottom: SPACING.xxl,
      maxHeight: '85%',
    },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.glassBorder, alignSelf: 'center', marginBottom: SPACING.md },
    title: { ...TYPOGRAPHY.h3, textAlign: 'center' },
    subtitle: { ...TYPOGRAPHY.caption, textAlign: 'center', marginTop: 4, marginBottom: SPACING.lg },
    errorBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: 'rgba(248,113,113,0.12)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.4)',
      borderRadius: RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.md,
    },
    errorText: { color: COLORS.error, fontSize: 12.5, fontWeight: '600', flex: 1 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    swatch: {
      width: 84, height: 84, borderRadius: RADIUS.md, overflow: 'hidden',
      borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center',
    },
    swatchSelected: { borderColor: COLORS.primary },
    swatchLabel: { color: '#fff', fontSize: 10.5, fontWeight: '700', marginTop: 4, textAlign: 'center', paddingHorizontal: 4 },
    checkBadge: {
      position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10,
      backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    },
    actionRow: { gap: SPACING.sm, marginTop: SPACING.lg },
    actionBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md, paddingVertical: 13,
    },
    actionBtnText: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
    closeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: SPACING.md },
    closeText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  }));

  const save = async (value: string | null) => {
    setSaving(value ?? 'clear');
    setError(null);
    try {
      const path = scope === 'global' ? '/chats/wallpaper' : `/chats/${chatId}/wallpaper`;
      const res = await fetchApi(path, { method: 'PATCH', body: JSON.stringify({ wallpaperUrl: value }) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Could not save wallpaper');
        return;
      }
      onSaved(value);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Network error — check your connection');
    } finally {
      setSaving(null);
    }
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to set a custom wallpaper.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [9, 19],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    setSaving('upload');
    setError(null);
    try {
      const { url } = await uploadMedia(result.assets[0].uri, 'image');
      await save(url);
    } catch (e: any) {
      setError(e.message || 'Upload failed');
      setSaving(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>{scope === 'global' ? 'Default Chat Wallpaper' : 'Wallpaper for this chat'}</Text>
          <Text style={styles.subtitle}>
            {scope === 'global' ? 'Applied to every chat, unless a chat has its own wallpaper set.' : 'Only changes what you see in this conversation.'}
          </Text>

          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.row}>
              {CHAT_WALLPAPER_PRESETS.map(preset => {
                const selected = currentValue === preset.id;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    disabled={!!saving}
                    onPress={() => save(preset.id)}
                    style={[styles.swatch, selected && styles.swatchSelected]}
                  >
                    <LinearGradient colors={preset.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                      {saving === preset.id ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.swatchLabel}>{preset.label}</Text>
                      )}
                      {selected && (
                        <View style={styles.checkBadge}>
                          <Ionicons name="checkmark" size={13} color="#fff" />
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
              {currentValue && !isPresetId(currentValue) && (
                <View style={[styles.swatch, styles.swatchSelected]}>
                  <Image source={{ uri: currentValue }} style={{ width: '100%', height: '100%' }} />
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={13} color="#fff" />
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={pickPhoto} disabled={!!saving}>
              {saving === 'upload' ? <ActivityIndicator color={COLORS.text} /> : <Ionicons name="image" size={18} color={COLORS.text} />}
              <Text style={styles.actionBtnText}>Choose a photo</Text>
            </TouchableOpacity>
            {(scope === 'global' ? !!currentValue : true) && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => save(null)} disabled={!!saving}>
                {saving === 'clear' ? <ActivityIndicator color={COLORS.text} /> : <Ionicons name="refresh" size={18} color={COLORS.text} />}
                <Text style={styles.actionBtnText}>{scope === 'global' ? 'Reset to app default' : 'Use default wallpaper'}</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={16} color={COLORS.textMuted} />
            <Text style={styles.closeText}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
