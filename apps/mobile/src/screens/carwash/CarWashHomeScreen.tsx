import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import SessionHeaderActions from '../../components/SessionHeaderActions';

export default function CarWashHomeScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY, SPACING, GRADIENTS } = theme;
  const [carWashes, setCarWashes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchApi('/carwash')
      .then(res => (res.ok ? res.json() : []))
      .then(data => setCarWashes(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('CarWashDetail', { carWashId: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardName}>{item.name}</Text>
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={12} color="#F59E0B" />
          <Text style={styles.ratingText}>{item.rating > 0 ? item.rating.toFixed(1) : 'New'}</Text>
        </View>
      </View>
      <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
      <View style={styles.cardFooter}>
        <Ionicons name="location" size={12} color={COLORS.textMuted} />
        <Text style={styles.cardAddress}>{item.address}</Text>
      </View>
    </TouchableOpacity>
  );

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING, TYPOGRAPHY }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
    },
    headerActions: { flexDirection: 'row', gap: SPACING.sm },
    headerBtn: {
      width: 40, height: 40,
      borderRadius: RADIUS.pill,
      backgroundColor: COLORS.glass,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      justifyContent: 'center', alignItems: 'center',
    },
    card: {
      backgroundColor: COLORS.glass,
      borderRadius: RADIUS.lg,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    cardName: { ...TYPOGRAPHY.h3, flex: 1 },
    ratingBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      paddingHorizontal: 6, paddingVertical: 2,
      borderRadius: RADIUS.pill,
    },
    ratingText: { color: '#F59E0B', fontSize: 12, fontWeight: '700' },
    cardDesc: { color: COLORS.textMuted, fontSize: 13, marginBottom: 8 },
    cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    cardAddress: { color: COLORS.textMuted, fontSize: 12, flex: 1 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
    emptyText: { color: COLORS.textMuted, fontSize: 14 },
    fab: {
      position: 'absolute', bottom: SPACING.xl, right: SPACING.lg,
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: COLORS.primary,
      justifyContent: 'center', alignItems: 'center',
      shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    },
  }));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <SessionHeaderActions
          navigation={navigation}
          session={{
            id: 'carwash',
            label: 'Carwash',
            icon: 'water',
            gradient: GRADIENTS.blue,
            route: { name: 'CarWashHome' },
          }}
        />
        <Text style={TYPOGRAPHY.h2}>Carwash</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('MyCarWashBookings')}>
            <Ionicons name="receipt" size={18} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('ManageCarWash')}>
            <Ionicons name="add" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={carWashes}
        keyExtractor={cw => cw.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {loading ? <ActivityIndicator color={COLORS.primary} /> : <Text style={styles.emptyText}>No car washes available.</Text>}
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Chat', { mode: 'ai', agentId: 'carwash' })}
      >
        <Ionicons name="sparkles" size={24} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
