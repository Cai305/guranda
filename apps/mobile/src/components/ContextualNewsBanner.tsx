import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';

interface Announcement {
  id: string;
  title: string;
  body: string;
  iconUrl?: string | null;
  createdAt: string;
}

// Contextual news — never a menu item. Given a contextType/contextKey, this
// renders 0..N compact rows inline wherever that context is on screen (a
// mini-app screen, a campaign detail page). Renders nothing when empty, so
// it's never a placeholder gap.
export default function ContextualNewsBanner({ contextType, contextKey }: { contextType: 'MINI_APP' | 'CAMPAIGN'; contextKey: string }) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [open, setOpen] = useState<Announcement | null>(null);
  const { theme } = useTheme();
  const { COLORS } = theme;

  useEffect(() => {
    if (!contextKey) return;
    fetchApi(`/announcements?contextType=${contextType}&contextKey=${encodeURIComponent(contextKey)}`)
      .then(r => (r.ok ? r.json() : []))
      .then(d => Array.isArray(d) && setItems(d))
      .catch(() => {});
  }, [contextType, contextKey]);

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    wrap: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm, gap: 8 },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md, padding: SPACING.sm,
    },
    icon: {
      width: 30, height: 30, borderRadius: 15, backgroundColor: `${COLORS.primary}22`,
      justifyContent: 'center', alignItems: 'center',
    },
    title: { color: COLORS.text, fontSize: 12, fontWeight: '700', flex: 1 },
    sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: COLORS.surfaceElevated, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
      padding: SPACING.lg, paddingBottom: 36, gap: 10,
    },
    sheetTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
    sheetBody: { color: COLORS.textMuted, fontSize: 14, lineHeight: 20 },
    closeBtn: { alignSelf: 'flex-end', padding: 6, marginTop: 10 },
    closeBtnText: { color: COLORS.primary, fontWeight: '700' },
  }));

  if (items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {items.map(a => (
        <TouchableOpacity key={a.id} style={styles.row} activeOpacity={0.85} onPress={() => setOpen(a)}>
          <View style={styles.icon}>
            <Ionicons name="megaphone-outline" size={15} color={COLORS.primary} />
          </View>
          <Text style={styles.title} numberOfLines={1}>{a.title}</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>
      ))}

      <Modal visible={!!open} transparent animationType="slide" onRequestClose={() => setOpen(null)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setOpen(null)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.sheetTitle}>{open?.title}</Text>
            <Text style={styles.sheetBody}>{open?.body}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setOpen(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
