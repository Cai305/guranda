import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../../theme';
import { fetchApi } from '../../utils/api';

export default function MyCarWashesScreen({ navigation }: any) {
  const [carWashes, setCarWashes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/carwash/mine');
      setCarWashes(await res.json());
    } catch {
      setCarWashes([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const deleteCarWash = (id: string) => {
    Alert.alert('Delete Car Wash', 'Are you sure you want to delete this car wash?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetchApi(`/carwash/${id}`, { method: 'DELETE' });
            setCarWashes(c => c.filter(x => x.id !== id));
          } catch {
            Alert.alert('Error', 'Failed to delete car wash');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Car Washes</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ManageCarWash', {})}>
          <Ionicons name="add-circle-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40, gap: 12 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.primary} />}
        >
          {carWashes.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="water-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No car washes listed yet</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ManageCarWash', {})}>
                <Text style={styles.emptyLink}>List your first car wash</Text>
              </TouchableOpacity>
            </View>
          ) : (
            carWashes.map(cw => (
              <View key={cw.id} style={styles.card}>
                <View style={styles.thumb}>
                  <Ionicons name="water" size={22} color={COLORS.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{cw.name}</Text>
                  <Text style={styles.cardSub} numberOfLines={1}>{cw.address}</Text>
                  <Text style={styles.cardMeta}>
                    {cw.services?.length ?? 0} service{cw.services?.length === 1 ? '' : 's'} · {cw._count?.bookings ?? 0} booking{cw._count?.bookings === 1 ? '' : 's'}
                  </Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('ManageCarWash', { carWash: cw })}>
                    <Ionicons name="create-outline" size={16} color={COLORS.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteCarWash(cw.id)}>
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
  back: { padding: 4 },
  headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 12, gap: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  thumb: { width: 52, height: 52, borderRadius: 10, backgroundColor: COLORS.surfaceElevated, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  cardTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14, marginBottom: 2 },
  cardSub: { color: COLORS.textMuted, fontSize: 12, marginBottom: 2 },
  cardMeta: { color: COLORS.textMuted, fontSize: 11 },
  cardActions: { flexDirection: 'row', gap: 8 },
  editBtn: { padding: 8, backgroundColor: COLORS.surfaceElevated, borderRadius: 8 },
  deleteBtn: { padding: 8, backgroundColor: '#ef444415', borderRadius: 8 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  emptyLink: { color: '#8B5CF6', fontWeight: '600', fontSize: 13, marginTop: 4 },
});
