import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, GLASS_CARD, RADIUS, GRADIENTS } from '../../theme';
import RiderView from './ride/RiderView';
import DriverView from './ride/DriverView';
import { fetchApi } from '../../utils/api';
import SessionHeaderActions from '../../components/SessionHeaderActions';

export default function RideScreen({ navigation }: any) {
  const [mode, setMode] = useState<'rider' | 'driver'>('rider');
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchApi('/ride/driver/profile')
      .then(async res => {
        if (res.ok) {
          const p = await res.json();
          setDriverProfile(p);
        }
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, []);

  const handleDriverPress = () => {
    if (!driverProfile?.vehicleMake) {
      Alert.alert(
        '🚗 Vehicle Info Required',
        'You need to add your vehicle details before you can drive.\n\nGo to your Profile → Edit Profile to add your vehicle information.',
        [{ text: 'Got it', style: 'cancel' }]
      );
      return;
    }
    setMode('driver');
  };

  return (
    <View style={styles.container}>
      {/* Full Screen View for Rider or Driver */}
      <View style={StyleSheet.absoluteFill}>
        {mode === 'rider' ? (
          <RiderView />
        ) : (
          <DriverView />
        )}
      </View>

      {/* Floating UI Overlay */}
      <View style={[styles.floatingHeader, { top: Math.max(insets.top, 20) }]}>
        <SessionHeaderActions
          navigation={navigation}
          session={{
            id: 'ride',
            label: 'Ride',
            icon: 'car',
            gradient: GRADIENTS.emerald,
            route: { name: 'Main', params: { screen: 'Life', params: { screen: 'Ride' } } },
          }}
        />

        <View style={styles.toggleContainer}>
          <TouchableOpacity 
            style={[styles.toggleBtn, mode === 'rider' && styles.activeToggle]}
            onPress={() => setMode('rider')}
          >
            <Text style={[styles.toggleText, mode === 'rider' && styles.activeToggleText]}>Rider</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, mode === 'driver' && styles.activeToggle]}
            onPress={handleDriverPress}
          >
            {profileLoading ? (
              <ActivityIndicator size="small" color={COLORS.textMuted} style={{ paddingHorizontal: 8 }} />
            ) : (
              <Text style={[styles.toggleText, mode === 'driver' && styles.activeToggleText]}>Driver</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ width: 44 }} /> {/* Balance the flex row for center alignment */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  floatingHeader: {
    position: 'absolute',
    left: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10, // Ensure it sits on top of maps
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  toggleContainer: {
    flexDirection: 'row',
    ...GLASS_CARD,
    backgroundColor: 'rgba(18, 18, 26, 0.8)', // slightly more opaque surface
    borderRadius: RADIUS.pill,
    padding: 4,
  },
  toggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: RADIUS.pill,
  },
  activeToggle: {
    backgroundColor: COLORS.primary,
  },
  toggleText: {
    color: COLORS.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
  activeToggleText: {
    color: COLORS.text,
    fontWeight: 'bold',
  },
});
