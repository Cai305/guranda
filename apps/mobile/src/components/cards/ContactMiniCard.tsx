import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';

export interface ContactCardData {
  name: string;
  phoneNumbers: string[];
}

export const CONTACT_CARD_TAG = '__contactCard';

export function encodeContactCard(data: ContactCardData): string {
  return JSON.stringify({ [CONTACT_CARD_TAG]: true, ...data });
}

export function decodeContactCard(content: string): ContactCardData | null {
  try {
    if (!content.includes(CONTACT_CARD_TAG)) return null;
    const parsed = JSON.parse(content);
    if (!parsed[CONTACT_CARD_TAG]) return null;
    const { [CONTACT_CARD_TAG]: _tag, ...rest } = parsed;
    return rest as ContactCardData;
  } catch {
    return null;
  }
}

export default function ContactMiniCard({ contact }: { contact: ContactCardData }) {
  const { theme } = useTheme();
  const { COLORS } = theme;

  const styles = useThemedStyles(({ COLORS, RADIUS }) => ({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: 'rgba(15,15,25,0.97)',
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: 'rgba(139,92,246,0.25)',
      padding: 12,
      minWidth: 220,
      maxWidth: 280,
    },
    avatar: {
      width: 42, height: 42, borderRadius: 21,
      backgroundColor: 'rgba(139,92,246,0.15)',
      alignItems: 'center', justifyContent: 'center',
    },
    info: { flex: 1 },
    name: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    number: { color: COLORS.textMuted, fontSize: 12, marginTop: 1 },
    callBtn: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: 'rgba(34,197,94,0.12)',
      alignItems: 'center', justifyContent: 'center',
    },
  }));

  const primaryNumber = contact.phoneNumbers?.[0];

  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Ionicons name="person" size={20} color={COLORS.primary} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{contact.name}</Text>
        {contact.phoneNumbers?.slice(0, 2).map((n, i) => (
          <Text key={i} style={styles.number} numberOfLines={1}>{n}</Text>
        ))}
      </View>
      {!!primaryNumber && (
        <TouchableOpacity
          style={styles.callBtn}
          onPress={() => Linking.openURL(`tel:${primaryNumber}`).catch(() => {})}
        >
          <Ionicons name="call" size={16} color="#22C55E" />
        </TouchableOpacity>
      )}
    </View>
  );
}
