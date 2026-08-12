import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import * as api from '../../../data/liveCategoryApi';
import { formatCurrency } from '../../../utils/format';
import { registerLiveCategoryPanel } from '../liveCategoryRegistry';

// ── Ride Live ────────────────────────────────────────────────────────────
// Lives in its own file (unlike the other 11 categories, which are still
// inline in LiveCategoryHostPanel.tsx / LiveCategoryViewerPanel.tsx) to
// prove out the registry: adding this category required zero edits to
// either panel component's rendering logic — just this file, plus one
// `registerLiveCategoryPanel` call at the bottom.
//
// The host here is a real driver from the Ride mini-app (apps/api/src/ride).
// Going online/offline from this panel flips the same DriverProfile row
// the standalone Ride screens (DriverView.tsx) use — a viewer isn't
// watching a simulated status, they're watching whether this driver is
// actually reachable for a real ride request right now. Pickup/dropoff
// addresses for an active ride are rider PII, so they're deliberately not
// surfaced to arbitrary Live viewers — only the non-identifying "on a
// ride" state and the driver's own fare/rating/ride-count are shown.

type RunFn = (fn: () => Promise<any>, onDone?: (r: any) => void) => void;

interface RideDriverStatus {
  isOnline: boolean;
  rating: number;
  totalRides: number;
  vehicleMake: string | null;
  vehicleModel: string | null;
  hasActiveRide: boolean;
  activeRideFare: number | null;
}

function useRidePanelStyles() {
  return useThemedStyles(({ COLORS, TYPOGRAPHY, RADIUS, SPACING }) => ({
    panel: {
      marginHorizontal: SPACING.lg, marginTop: SPACING.lg, marginBottom: SPACING.lg,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md, padding: SPACING.md, gap: 8,
    },
    panelTitle: { ...TYPOGRAPHY.label, fontSize: 11 },
    hint: { color: COLORS.textMuted, fontSize: 12, lineHeight: 17 },
    errorText: { color: COLORS.error, fontSize: 12 },
    statusPill: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.pill,
      alignSelf: 'flex-start',
    },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 12, fontWeight: '700' },
    statLine: { color: COLORS.text, fontSize: 13 },
    actionBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center' },
    actionBtnOffline: { backgroundColor: COLORS.error },
    actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  } as const));
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useRidePanelStyles();
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{title}</Text>
      {children}
    </View>
  );
}

function StatusPill({ status }: { status: RideDriverStatus }) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const styles = useRidePanelStyles();
  const color = status.isOnline ? COLORS.success : COLORS.textMuted;
  return (
    <View style={[styles.statusPill, { backgroundColor: `${color}22` }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{status.isOnline ? 'Online' : 'Offline'}</Text>
    </View>
  );
}

// ── Host ─────────────────────────────────────────────────────────────────
function RideHost({ roomId, run, error, busy }: { roomId: string; run: RunFn; error: string; busy: boolean }) {
  const [status, setStatus] = useState<RideDriverStatus | null>(null);
  const { theme } = useTheme();
  const { COLORS } = theme;
  const styles = useRidePanelStyles();

  useEffect(() => {
    api.getRoomState(roomId).then(s => setStatus(s.rideDriverStatus || null)).catch(() => {});
  }, [roomId]);

  const toggle = () => run(
    () => api.setRideOnlineStatus(roomId, !status?.isOnline),
    (s: RideDriverStatus) => setStatus(s),
  );

  if (!status) return <Panel title="Ride Live"><ActivityIndicator color={COLORS.primary} /></Panel>;

  return (
    <Panel title="Your driver status">
      <StatusPill status={status} />
      <Text style={styles.statLine}>{status.rating.toFixed(1)} ★ · {status.totalRides} rides completed</Text>
      {status.vehicleMake ? (
        <Text style={styles.hint}>{status.vehicleMake} {status.vehicleModel}</Text>
      ) : (
        <Text style={styles.hint}>Set up your vehicle from the Ride tab so riders can identify you.</Text>
      )}
      {status.hasActiveRide && (
        <Text style={styles.hint}>Currently on a ride{status.activeRideFare ? ` · ${formatCurrency(status.activeRideFare)}` : ''}</Text>
      )}
      <TouchableOpacity
        style={[styles.actionBtn, status.isOnline && styles.actionBtnOffline]}
        disabled={busy}
        onPress={toggle}
      >
        {busy ? <ActivityIndicator color="#fff" /> : (
          <Text style={styles.actionBtnText}>{status.isOnline ? 'Go Offline' : 'Go Online'}</Text>
        )}
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </Panel>
  );
}

// ── Viewer ───────────────────────────────────────────────────────────────
function RideViewer({ roomId, state, run, error, busy, navigation }: {
  roomId: string; state: any; run: RunFn; error: string; busy: boolean; navigation: any;
}) {
  const styles = useRidePanelStyles();
  const status: RideDriverStatus | null = state?.rideDriverStatus || null;

  if (!status) return <Panel title="Ride Live"><Text style={styles.hint}>No driver status yet.</Text></Panel>;

  const connect = () => run(
    () => api.connectWithHost(roomId),
    (chat: any) => navigation.navigate('Chat', { chatId: chat.id }),
  );

  return (
    <Panel title="Driver status">
      <StatusPill status={status} />
      <Text style={styles.statLine}>{status.rating.toFixed(1)} ★ · {status.totalRides} rides completed</Text>
      {status.vehicleMake ? <Text style={styles.hint}>{status.vehicleMake} {status.vehicleModel}</Text> : null}
      {status.hasActiveRide && <Text style={styles.hint}>Currently on a ride</Text>}
      <TouchableOpacity style={styles.actionBtn} disabled={busy} onPress={connect}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Message driver</Text>}
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </Panel>
  );
}

registerLiveCategoryPanel('ride', { Host: RideHost, Viewer: RideViewer });
