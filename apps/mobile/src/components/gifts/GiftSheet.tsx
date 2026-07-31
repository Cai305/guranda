import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../theme';
import { fetchApi } from '../../utils/api';

export interface GiftCatalogItem {
  key: string;
  label: string;
  icon: string;
  amount: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
  context: 'live' | 'game';
  contextId?: string;
  onSent?: (item: GiftCatalogItem) => void;
}

export default function GiftSheet({ visible, onClose, recipientId, recipientName, context, contextId, onSent }: Props) {
  const [catalog, setCatalog] = useState<GiftCatalogItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [sendingKey, setSendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    fetchApi('/gifts/catalog')
      .then(res => (res.ok ? res.json() : []))
      .then(data => Array.isArray(data) && setCatalog(data))
      .catch(() => {})
      .finally(() => setLoadingCatalog(false));
  }, [visible]);

  const sendGift = async (item: GiftCatalogItem) => {
    setSendingKey(item.key);
    setError(null);
    try {
      const res = await fetchApi('/gifts/send', {
        method: 'POST',
        body: JSON.stringify({ recipientId, giftType: item.key, context, contextId }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Alert.alert renders nothing on web in this app, so an error-only
        // toast here would be invisible to web users — this inline banner
        // is the one notice guaranteed to show on every platform.
        setError(data.message || 'Something went wrong');
        return;
      }
      onSent?.(item);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Network error — check your connection');
    } finally {
      setSendingKey(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>Send a gift to {recipientName}</Text>
          <Text style={styles.subtitle}>Gifts are paid instantly from your MSH wallet.</Text>

          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {loadingCatalog ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: SPACING.xl }} />
          ) : (
            <View style={styles.grid}>
              {catalog.map(item => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.card}
                  disabled={!!sendingKey}
                  onPress={() => sendGift(item)}
                >
                  {sendingKey === item.key ? (
                    <ActivityIndicator color={COLORS.primary} />
                  ) : (
                    <>
                      <Text style={styles.cardIcon}>{item.icon}</Text>
                      <Text style={styles.cardLabel}>{item.label}</Text>
                      <Text style={styles.cardAmount}>{item.amount} MSH</Text>
                    </>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={16} color={COLORS.textMuted} />
            <Text style={styles.closeText}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#150A2E',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.glassBorder,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  title: { ...TYPOGRAPHY.h3, textAlign: 'center' },
  subtitle: { ...TYPOGRAPHY.caption, textAlign: 'center', marginTop: 4, marginBottom: SPACING.lg },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.4)',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  errorText: { color: COLORS.error, fontSize: 12.5, fontWeight: '600', flex: 1 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  card: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    minHeight: 84,
    justifyContent: 'center',
  },
  cardIcon: { fontSize: 28 },
  cardLabel: { color: COLORS.text, fontSize: 12, fontWeight: '700', marginTop: 4 },
  cardAmount: { color: COLORS.gold, fontSize: 11, fontWeight: '600', marginTop: 2 },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.lg,
  },
  closeText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
});
