import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import { navigationRef } from '../navigation/navigationRef';
import { miniAppIdForRoute } from '../config/miniAppContextMap';

interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

// Mounted once at the app root (sibling to NavigationContainer, same
// pattern as IncomingCallOverlay/UploadStatusOverlay) so every one of the
// 17 MINI_APP_IDS screens gets contextual news automatically, without
// editing any of their files — a single navigation-state listener resolves
// the current route to a mini-app id via miniAppContextMap.ts. Renders
// nothing on any screen that isn't a mini-app, or has no live announcements.
export default function ContextualNewsOverlay() {
  const [miniAppId, setMiniAppId] = useState<string | null>(null);
  const [items, setItems] = useState<Announcement[]>([]);
  const [expanded, setExpanded] = useState(false);
  const insets = useSafeAreaInsets();
  const lastFetchedId = useRef<string | null>(null);

  useEffect(() => {
    const resolveFromCurrentRoute = () => {
      if (!navigationRef.isReady()) return;
      const routeName = navigationRef.getCurrentRoute()?.name;
      setMiniAppId(miniAppIdForRoute(routeName));
    };
    resolveFromCurrentRoute();
    const unsubscribe = navigationRef.addListener?.('state', resolveFromCurrentRoute);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!miniAppId) {
      setItems([]);
      return;
    }
    if (lastFetchedId.current === miniAppId) return;
    lastFetchedId.current = miniAppId;
    fetchApi(`/announcements?contextType=MINI_APP&contextKey=${encodeURIComponent(miniAppId)}`)
      .then(r => (r.ok ? r.json() : []))
      .then(d => Array.isArray(d) && setItems(d))
      .catch(() => {});
  }, [miniAppId]);

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    pillWrap: { position: 'absolute' as const, top: 0, right: SPACING.md, zIndex: 50 },
    pill: {
      flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6,
      backgroundColor: COLORS.primary, borderRadius: RADIUS.pill,
      paddingHorizontal: 12, paddingVertical: 7,
      shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
    },
    pillText: { color: '#fff', fontSize: 12, fontWeight: '800' },
    sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' as const },
    sheet: {
      backgroundColor: COLORS.surfaceElevated, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
      padding: SPACING.lg, paddingBottom: 36, maxHeight: '70%' as const,
    },
    sheetTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800', marginBottom: SPACING.md },
    row: { marginBottom: SPACING.md },
    rowTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 4 },
    rowBody: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18 },
  }));

  if (items.length === 0) return null;

  return (
    <View style={[styles.pillWrap, { top: insets.top + 6 }]} pointerEvents="box-none">
      <TouchableOpacity style={styles.pill} activeOpacity={0.85} onPress={() => setExpanded(true)}>
        <Ionicons name="megaphone" size={13} color="#fff" />
        <Text style={styles.pillText}>{items.length === 1 ? '1 update' : `${items.length} updates`}</Text>
      </TouchableOpacity>

      <Modal visible={expanded} transparent animationType="slide" onRequestClose={() => setExpanded(false)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setExpanded(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.sheetTitle}>Updates</Text>
            <ScrollView>
              {items.map(a => (
                <View key={a.id} style={styles.row}>
                  <Text style={styles.rowTitle}>{a.title}</Text>
                  <Text style={styles.rowBody}>{a.body}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
