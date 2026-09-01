import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';

const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function ManageEventScreen({ navigation, route }: any) {
  const { eventId } = route.params;
  const [event, setEvent] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [stats, setStats] = useState<{ sold: number; checkedIn: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [managerUsername, setManagerUsername] = useState('');
  const [scannerUsername, setScannerUsername] = useState('');
  const [addingManager, setAddingManager] = useState(false);
  const [addingScanner, setAddingScanner] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removingManagerId, setRemovingManagerId] = useState<string | null>(null);
  const [removingScannerId, setRemovingScannerId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const [eventRes, teamRes, statsRes] = await Promise.all([
        fetchApi(`/entertainment/events/${eventId}`),
        fetchApi(`/entertainment/events/${eventId}/team`),
        fetchApi(`/entertainment/events/${eventId}/tickets/stats`),
      ]);
      if (!eventRes.ok || !teamRes.ok || !statsRes.ok) throw new Error('Failed to load event');
      setEvent(await eventRes.json());
      setTeam(await teamRes.json());
      setStats(await statsRes.json());
    } catch (e: any) {
      setError(e.message || 'Failed to load event');
    }
    setLoading(false);
  }, [eventId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const isOrganizer = !!(event && team && event.organizerId === team.organizer?.id);

  const addManager = async () => {
    if (!managerUsername.trim()) return;
    setAddingManager(true);
    try {
      const res = await fetchApi(`/entertainment/events/${eventId}/managers`, { method: 'POST', body: JSON.stringify({ username: managerUsername.trim() }) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Failed to add co-manager'); }
      setManagerUsername('');
      load();
    } catch (e: any) { Alert.alert('Error', e.message); }
    setAddingManager(false);
  };

  const removeManager = async (userId: string) => {
    setRemovingManagerId(userId);
    try {
      await fetchApi(`/entertainment/events/${eventId}/managers/${userId}`, { method: 'DELETE' });
      load();
    } catch { Alert.alert('Error', 'Failed to remove co-manager'); } finally {
      setRemovingManagerId(null);
    }
  };

  const addScanner = async () => {
    if (!scannerUsername.trim()) return;
    setAddingScanner(true);
    try {
      const res = await fetchApi(`/entertainment/events/${eventId}/scanners`, { method: 'POST', body: JSON.stringify({ username: scannerUsername.trim() }) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Failed to add scanner'); }
      setScannerUsername('');
      load();
    } catch (e: any) { Alert.alert('Error', e.message); }
    setAddingScanner(false);
  };

  const removeScanner = async (userId: string) => {
    setRemovingScannerId(userId);
    try {
      await fetchApi(`/entertainment/events/${eventId}/scanners/${userId}`, { method: 'DELETE' });
      load();
    } catch { Alert.alert('Error', 'Failed to remove scanner'); } finally {
      setRemovingScannerId(null);
    }
  };

  const regenerateCode = async (type: 'manager' | 'scanner') => {
    try {
      const res = await fetchApi(`/entertainment/events/${eventId}/invite/regenerate`, { method: 'POST', body: JSON.stringify({ type }) });
      if (!res.ok) throw new Error();
      await load();
    } catch { Alert.alert('Error', 'Failed to generate invite code'); }
  };

  const shareCode = (code: string, label: string) => {
    Share.share({ message: `Join my Guranda event team as ${label}! Use invite code: ${code}` }).catch(() => {});
  };

  const deleteEvent = () => {
    Alert.alert('Delete event', `Delete "${event.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setDeleting(true);
          try {
            const res = await fetchApi(`/entertainment/events/${eventId}`, { method: 'DELETE' });
            if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Failed to delete event'); }
            navigation.goBack();
          } catch (e: any) {
            Alert.alert('Error', e.message);
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;

  const styles = useThemedStyles(({ COLORS, SPACING, TYPOGRAPHY }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: SPACING.lg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12, gap: 8 },
    iconBtn: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h3, flex: 1, fontWeight: '700' },
    subMeta: { color: COLORS.textMuted, fontSize: 13 },
    statsRow: { flexDirection: 'row', gap: 10 },
    statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 14, alignItems: 'center' },
    statValue: { color: COLORS.text, fontSize: 22, fontWeight: '800' },
    statLabel: { color: COLORS.textMuted, fontSize: 10, marginTop: 2, textAlign: 'center' },
    verifyBtn: { flexDirection: 'row', gap: 8, backgroundColor: '#10B981', borderRadius: 14, padding: 15, alignItems: 'center', justifyContent: 'center' },
    verifyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    sectionTitle: { ...TYPOGRAPHY.label, fontSize: 11, marginBottom: 10 },
    teamCard: { backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 14, gap: 12 },
    teamRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    teamName: { color: COLORS.text, fontSize: 13, fontWeight: '600', flex: 1 },
    teamRoleTag: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    removeBtn: { padding: 4 },
    label: { color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 8 },
    addRow: { flexDirection: 'row', gap: 8 },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14, color: COLORS.text, fontSize: 14 },
    addBtn: { width: 48, backgroundColor: '#10B981', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    codeCard: { backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 14 },
    codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    codeLabel: { color: COLORS.textMuted, fontSize: 11, marginBottom: 2 },
    codeValue: { color: COLORS.text, fontSize: 16, fontWeight: '800', letterSpacing: 1 },
    codeIconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  }));

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if (error || !event || !team || !stats) return <View style={styles.center}><Text style={{ color: COLORS.textMuted }}>{error || 'Event not found'}</Text></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{event.title}</Text>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <TouchableOpacity onPress={() => navigation.navigate('EventForm', { eventId })} style={styles.iconBtn}>
            <Ionicons name="create-outline" size={20} color={COLORS.text} />
          </TouchableOpacity>
          {isOrganizer && (
            <TouchableOpacity onPress={deleteEvent} style={styles.iconBtn} disabled={deleting}>
              {deleting ? <ActivityIndicator size="small" color="#ef4444" /> : <Ionicons name="trash-outline" size={20} color="#ef4444" />}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, paddingTop: 4, paddingBottom: 40, gap: 20 }}>
        <Text style={styles.subMeta}>{event.category} · {event.venue}, {event.city}</Text>
        <Text style={styles.subMeta}>{fmt(event.startsAt)}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.sold}</Text>
            <Text style={styles.statLabel}>Tickets Sold</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.checkedIn}</Text>
            <Text style={styles.statLabel}>Checked In</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{event.ticketsAvailable}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.verifyBtn} onPress={() => navigation.navigate('VerifyTicket', { eventId, eventTitle: event.title })}>
          <Ionicons name="scan-outline" size={18} color="#fff" />
          <Text style={styles.verifyBtnText}>Verify Tickets at the Door</Text>
        </TouchableOpacity>

        <View>
          <Text style={styles.sectionTitle}>TEAM</Text>
          <View style={styles.teamCard}>
            <View style={styles.teamRow}>
              <Ionicons name="star" size={16} color="#FBBF24" />
              <Text style={styles.teamName}>@{team.organizer.username}</Text>
              <Text style={styles.teamRoleTag}>Organizer</Text>
            </View>
            {team.managers.map((m: any) => (
              <View key={m.id} style={styles.teamRow}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#22D3EE" />
                <Text style={styles.teamName}>@{m.username}</Text>
                <Text style={styles.teamRoleTag}>Co-Manager</Text>
                {isOrganizer && (
                  <TouchableOpacity onPress={() => removeManager(m.id)} style={styles.removeBtn} disabled={removingManagerId === m.id}>
                    {removingManagerId === m.id ? (
                      <ActivityIndicator size="small" color={COLORS.textMuted} />
                    ) : (
                      <Ionicons name="close" size={16} color={COLORS.textMuted} />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {team.scanners.map((s: any) => (
              <View key={s.id} style={styles.teamRow}>
                <Ionicons name="scan-outline" size={16} color="#F59E0B" />
                <Text style={styles.teamName}>@{s.username}</Text>
                <Text style={styles.teamRoleTag}>Scanner</Text>
                <TouchableOpacity onPress={() => removeScanner(s.id)} style={styles.removeBtn} disabled={removingScannerId === s.id}>
                  {removingScannerId === s.id ? (
                    <ActivityIndicator size="small" color={COLORS.textMuted} />
                  ) : (
                    <Ionicons name="close" size={16} color={COLORS.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {isOrganizer && (
          <View>
            <Text style={styles.label}>Add co-manager by username</Text>
            <View style={styles.addRow}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="username" placeholderTextColor={COLORS.textMuted} value={managerUsername} onChangeText={setManagerUsername} autoCapitalize="none" />
              <TouchableOpacity style={styles.addBtn} onPress={addManager} disabled={addingManager}>
                {addingManager ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="add" size={20} color="#fff" />}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View>
          <Text style={styles.label}>Add scanner by username</Text>
          <View style={styles.addRow}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="username" placeholderTextColor={COLORS.textMuted} value={scannerUsername} onChangeText={setScannerUsername} autoCapitalize="none" />
            <TouchableOpacity style={styles.addBtn} onPress={addScanner} disabled={addingScanner}>
              {addingScanner ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="add" size={20} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>

        {isOrganizer && (
          <View>
            <Text style={styles.sectionTitle}>INVITE CODES</Text>
            <View style={styles.codeCard}>
              <View style={styles.codeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.codeLabel}>Co-Manager invite</Text>
                  <Text style={styles.codeValue}>{team.managerInviteCode || 'Not generated'}</Text>
                </View>
                {team.managerInviteCode && (
                  <TouchableOpacity style={styles.codeIconBtn} onPress={() => shareCode(team.managerInviteCode, 'co-manager')}>
                    <Ionicons name="share-social-outline" size={18} color={COLORS.text} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.codeIconBtn} onPress={() => regenerateCode('manager')}>
                  <Ionicons name="refresh" size={18} color="#22D3EE" />
                </TouchableOpacity>
              </View>
              <View style={[styles.codeRow, { marginTop: 12 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.codeLabel}>Scanner invite</Text>
                  <Text style={styles.codeValue}>{team.scannerInviteCode || 'Not generated'}</Text>
                </View>
                {team.scannerInviteCode && (
                  <TouchableOpacity style={styles.codeIconBtn} onPress={() => shareCode(team.scannerInviteCode, 'scanner')}>
                    <Ionicons name="share-social-outline" size={18} color={COLORS.text} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.codeIconBtn} onPress={() => regenerateCode('scanner')}>
                  <Ionicons name="refresh" size={18} color="#F59E0B" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
