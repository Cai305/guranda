import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../theme';
import { fetchApi } from '../utils/api';

export default function SendRelationshipRequestScreen({ route, navigation }: any) {
  const { intendedStatus } = route.params ?? { intendedStatus: 'IN_RELATIONSHIP' };
  const [username, setUsername] = useState('');
  const [sending, setSending] = useState(false);

  const label = intendedStatus === 'MARRIED' ? 'Married' : 'In a Relationship';

  const send = async () => {
    if (!username.trim()) return;
    setSending(true);
    try {
      const res = await fetchApi('/relationships/request', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim(), intendedStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Failed to send request');
      }
      Alert.alert('Request sent', `We'll let you know if @${username.trim().replace(/^@/, '')} accepts.`);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Link a Partner</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.body}>
        <Ionicons name="heart" size={40} color={COLORS.primary} style={{ alignSelf: 'center', marginBottom: 12 }} />
        <Text style={styles.hint}>
          Send a request to link up as "{label}". They'll need to accept before it shows on either of your profiles.
        </Text>
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            placeholder="Their username"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />
          <TouchableOpacity style={styles.addBtn} onPress={send} disabled={sending}>
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  body: { padding: SPACING.lg },
  hint: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', marginBottom: SPACING.lg, lineHeight: 18 },
  addRow: { flexDirection: 'row', gap: SPACING.sm },
  addInput: {
    flex: 1, backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, color: COLORS.text,
  },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, width: 44, alignItems: 'center', justifyContent: 'center' },
});
