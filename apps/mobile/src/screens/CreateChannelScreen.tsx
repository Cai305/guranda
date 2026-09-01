import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import { invalidateCachedResponse } from '../utils/apiCache';

const CHANNEL_TYPES: { key: string; label: string; desc: string; icon: string }[] = [
  { key: 'TEXT', label: 'Text', desc: 'Any member can post', icon: 'chatbubbles-outline' },
  { key: 'ANNOUNCEMENT', label: 'Announcement', desc: 'Only admins & mods can post, everyone can read', icon: 'megaphone-outline' },
  { key: 'VOICE', label: 'Voice', desc: 'Live audio room, anyone can talk', icon: 'mic-outline' },
];

export default function CreateChannelScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const { communityId } = route.params;
  const [name, setName] = useState('');
  const [channelType, setChannelType] = useState('TEXT');
  const [loading, setLoading] = useState(false);

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    closeBtn: { padding: 5 },
    createBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    createBtnDisabled: { opacity: 0.5 },
    createBtnText: { ...TYPOGRAPHY.body2, color: COLORS.surface, fontWeight: 'bold' },
    form: { padding: 20 },
    label: { ...TYPOGRAPHY.body2, color: COLORS.textMuted, marginBottom: 8, marginTop: 16 },
    input: {
      backgroundColor: COLORS.surface, color: COLORS.text, paddingHorizontal: 15, paddingVertical: 12,
      borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, fontSize: 16,
    },
    typeOption: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      padding: 14, borderRadius: 12, backgroundColor: COLORS.surface,
      borderWidth: 1, borderColor: COLORS.border, marginTop: 10,
    },
    typeOptionActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}15` },
    typeIcon: {
      width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background,
      alignItems: 'center', justifyContent: 'center',
    },
    typeTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    typeDesc: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  }));

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      setLoading(true);
      const res = await fetchApi(`/communities/${communityId}/channels`, {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), channelType }),
      });
      if (res.ok) {
        await invalidateCachedResponse(`/communities/${communityId}`);
        navigation.goBack();
      } else {
        const data = await res.json().catch(() => null);
        Alert.alert('Error', data?.message || "Couldn't create the channel.");
      }
    } catch {
      Alert.alert('Error', 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={TYPOGRAPHY.h3}>New Channel</Text>
          <TouchableOpacity
            style={[styles.createBtn, (!name.trim() || loading) && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={!name.trim() || loading}
          >
            {loading ? <ActivityIndicator color={COLORS.surface} size="small" /> : <Text style={styles.createBtnText}>Create</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Channel Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. announcements"
            placeholderTextColor={COLORS.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
            autoCapitalize="none"
          />

          <Text style={styles.label}>Type</Text>
          {CHANNEL_TYPES.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.typeOption, channelType === t.key && styles.typeOptionActive]}
              onPress={() => setChannelType(t.key)}
            >
              <View style={styles.typeIcon}>
                <Ionicons name={t.icon as any} size={18} color={channelType === t.key ? COLORS.primary : COLORS.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.typeTitle}>{t.label}</Text>
                <Text style={styles.typeDesc}>{t.desc}</Text>
              </View>
              {channelType === t.key && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
