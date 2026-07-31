import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY } from '../../../theme';
import { fetchApi } from '../../../utils/api';

export default function HairBookingScreen({ route, navigation }: any) {
  const { service, profile, selectedItemIds, totalCost } = route.params;
  const [loading, setLoading] = useState(false);

  // Hardcode a date for demonstration (e.g. tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const confirmBooking = async () => {
    try {
      setLoading(true);
      await fetchApi('/hair/book', {
        method: 'POST',
        body: JSON.stringify({
          hairdresserId: profile.id,
          serviceId: service.id,
          appointmentAt: tomorrow.toISOString(),
          purchasedItemsIds: selectedItemIds,
        }),
      });
      
      Alert.alert(
        'Booking Confirmed',
        `Your appointment at ${profile.businessName} is booked for tomorrow at 10:00 AM.`,
        [
          { text: 'View Appointments', onPress: () => navigation.navigate('Dashboard') },
          { text: 'Done', onPress: () => navigation.popToTop() } // Or back to HairHome
        ]
      );
    } catch (error) {
      console.error(error);
      Alert.alert('Booking Failed', 'An error occurred while booking your appointment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h3}>Checkout</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={TYPOGRAPHY.h3}>{profile.businessName}</Text>
          <Text style={[TYPOGRAPHY.body2, { color: COLORS.textMuted, marginTop: 4 }]}>
            {profile.address}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={TYPOGRAPHY.h4}>Appointment Details</Text>
          <View style={styles.row}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
            <Text style={[TYPOGRAPHY.body1, { marginLeft: 10 }]}>Tomorrow, 10:00 AM</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={TYPOGRAPHY.h4}>Order Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={TYPOGRAPHY.body1}>{service.title}</Text>
            <Text style={TYPOGRAPHY.body1}>R{service.price}</Text>
          </View>
          
          {selectedItemIds.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={[TYPOGRAPHY.body2, { color: COLORS.textMuted }]}>Included items:</Text>
              {service.requiredItems
                .filter((item: any) => selectedItemIds.includes(item.id))
                .map((item: any) => (
                  <View key={item.id} style={styles.summaryRow}>
                    <Text style={TYPOGRAPHY.body2}>+ {item.name}</Text>
                    <Text style={TYPOGRAPHY.body2}>R{item.price}</Text>
                  </View>
                ))}
            </View>
          )}

          <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={TYPOGRAPHY.h3}>Total</Text>
            <Text style={[TYPOGRAPHY.h2, { color: COLORS.primary }]}>R{totalCost}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.bookButton, loading && { opacity: 0.7 }]}
          onPress={confirmBooking}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={[TYPOGRAPHY.h3, { color: '#FFF' }]}>Confirm Booking</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  bookButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
});
