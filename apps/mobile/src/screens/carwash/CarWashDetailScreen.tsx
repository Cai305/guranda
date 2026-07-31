import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../theme';
import { fetchApi } from '../../utils/api';

export default function CarWashDetailScreen({ route, navigation }: any) {
  const { carWashId } = route.params;
  const [carWash, setCarWash] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookingId, setBookingId] = useState<string | null>(null);

  useEffect(() => {
    fetchApi(`/carwash/${carWashId}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => setCarWash(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [carWashId]);

  const handleBook = async (serviceId: string) => {
    try {
      setBookingId(serviceId);
      const res = await fetchApi(`/carwash/${carWashId}/book`, {
        method: 'POST',
        body: JSON.stringify({ serviceId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to book');
      }
      Alert.alert('Success', 'Car wash booked successfully!');
    } catch (e: any) {
      Alert.alert('Booking Error', e.message);
    } finally {
      setBookingId(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (!carWash) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: COLORS.textMuted }}>Car wash not found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>{carWash.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}>
        <Text style={styles.desc}>{carWash.description}</Text>
        
        <View style={styles.infoRow}>
          <Ionicons name="location" size={16} color={COLORS.primary} />
          <Text style={styles.infoText}>{carWash.address}</Text>
        </View>

        <Text style={styles.sectionTitle}>Services & Pricing</Text>
        
        {carWash.services?.length > 0 ? (
          carWash.services.map((service: any) => (
            <View key={service.id} style={styles.serviceCard}>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceDesc}>{service.description}</Text>
                <Text style={styles.servicePrice}>{service.price} MSH</Text>
              </View>
              <TouchableOpacity
                style={styles.bookBtn}
                onPress={() => handleBook(service.id)}
                disabled={bookingId === service.id || !service.isAvailable}
              >
                {bookingId === service.id ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.bookBtnText}>{service.isAvailable ? 'Book' : 'N/A'}</Text>
                )}
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={{ color: COLORS.textMuted }}>No services listed yet.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.glass,
    borderWidth: 1, borderColor: COLORS.glassBorder,
    justifyContent: 'center', alignItems: 'center',
  },
  desc: { color: COLORS.text, fontSize: 14, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  infoText: { color: COLORS.textMuted, fontSize: 14 },
  sectionTitle: { ...TYPOGRAPHY.h3, marginBottom: 12 },
  serviceCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.glass,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.glassBorder,
    alignItems: 'center',
  },
  serviceInfo: { flex: 1, marginRight: 16 },
  serviceName: { color: COLORS.text, fontWeight: '700', fontSize: 16 },
  serviceDesc: { color: COLORS.textMuted, fontSize: 12, marginVertical: 4 },
  servicePrice: { color: COLORS.primary, fontWeight: 'bold', fontSize: 14 },
  bookBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: RADIUS.pill,
  },
  bookBtnText: { color: '#FFF', fontWeight: 'bold' },
});
