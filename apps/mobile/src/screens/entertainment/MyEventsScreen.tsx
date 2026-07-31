import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, SPACING } from '../../theme';
import { fetchApi } from '../../utils/api';

const ROLE_META: Record<string, { label: string; color: string }> = {
  ORGANIZER: { label: 'Organizer', color: '#10B981' },
  CO_MANAGER: { label: 'Co-Manager', color: '#22D3EE' },
  SCANNER: { label: 'Scanner', color: '#F59E0B' },
};

const dateStr = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export default function MyEventsScreen({ navigation }: any) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/entertainment/events/mine');
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch { setEvents([]); }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openEvent = (event: any) => {
    if (event.myRole === 'SCANNER') navigation.navigate('VerifyTicket', { eventId: event.id, eventTitle: event.title });
    else navigation.navigate('ManageEvent', { eventId: event.id });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Events</Text>
        <TouchableOpacity onPress={() => navigation.navigate('EventForm')} style={styles.iconBtn}>
          <Ionicons name="add" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.joinRow} onPress={() => navigation.navigate('JoinEventTeam')}>
        <Ionicons name="key-outline" size={16} color="#10B981" />
        <Text style={styles.joinText}>Have an invite code? Join a team</Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: SPACING.lg, paddingTop: 4, paddingBottom: 40, gap: 12 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.primary} />}
        >
          {events.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No events yet</Text>
              <Text style={styles.emptySub}>Create a live event or join a team with an invite code</Text>
            </View>
          ) : (
            events.map(event => {
              const role = ROLE_META[event.myRole] || ROLE_META.ORGANIZER;
              return (
                <TouchableOpacity key={event.id} style={styles.card} activeOpacity={0.85} onPress={() => openEvent(event)}>
                  <View style={styles.topRow}>
                    <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
                    <View style={[styles.rolePill, { backgroundColor: `${role.color}22` }]}>
                      <Text style={[styles.roleText, { color: role.color }]}>{role.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.sub}>{event.category} · {event.venue}, {event.city}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.meta}>{dateStr(event.startsAt)}</Text>
                    <Text style={styles.meta}>{event.ticketsAvailable}/{event.ticketsTotal} available</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
  iconBtn: { padding: 4 },
  headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
  joinRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: SPACING.lg, marginBottom: 12, padding: 12,
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  joinText: { color: COLORS.text, fontSize: 13, fontWeight: '600', flex: 1 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, gap: 6,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { color: COLORS.text, fontSize: 15, fontWeight: '700', flex: 1 },
  rolePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  roleText: { fontSize: 10, fontWeight: '700' },
  sub: { color: '#10B981', fontSize: 12, fontWeight: '600' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { color: COLORS.textMuted, fontSize: 11 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  emptySub: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },
});
