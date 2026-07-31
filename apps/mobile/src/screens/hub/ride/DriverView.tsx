import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, TextInput } from 'react-native';
import { COLORS, TYPOGRAPHY, RADIUS, SHADOW, SPACING } from '../../../theme';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../../../utils/api';
import { rideSocket } from '../../../services/RideSocketService';
import * as Location from 'expo-location';

// react-native-maps doesn't work on web — use a conditional import
let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}

const INITIAL_REGION = {
  latitude: -26.2041,
  longitude: 28.0473,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function DriverView() {
  const [isOnline, setIsOnline] = useState(false);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [incomingRides, setIncomingRides] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [isSettingUpVehicle, setIsSettingUpVehicle] = useState(false);
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const socket = await rideSocket.connect();
      if (cancelled || !socket) return;

      // Check for existing active ride
      try {
        const res = await fetchApi('/ride/driver/active-ride');
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data) {
            setActiveRide(data);
            setIsOnline(true);
            rideSocket.joinRideRoom(data.id);
          }
        }
      } catch {}

      // Fetch driver profile
      try {
        const res = await fetchApi('/ride/driver/profile');
        if (res.ok && !cancelled) {
          const p = await res.json();
          if (p) {
            setProfile(p);
            setIsOnline(p.isOnline);
          }
        }
      } catch {}

      // Register listeners — socket is guaranteed to exist here
      socket.on('rideRequested', (ride: any) => {
        if (cancelled) return;
        setIncomingRides(prev => [ride, ...prev.filter(r => r.id !== ride.id)]);
      });

      socket.on('rideUnavailable', ({ rideId }: { rideId: string }) => {
        if (cancelled) return;
        setIncomingRides(prev => prev.filter(r => r.id !== rideId));
      });
    };

    init();

    return () => {
      cancelled = true;
      rideSocket.socket?.off('rideRequested');
      rideSocket.socket?.off('rideUnavailable');
      stopLocationWatch();
    };
  }, []);

  const toggleOnlineStatus = async () => {
    if (!isOnline && (!profile || !profile.vehicleMake)) {
      setIsSettingUpVehicle(true);
      return;
    }

    const newStatus = !isOnline;
    const res = await fetchApi('/ride/driver/status', {
      method: 'POST',
      body: JSON.stringify({ isOnline: newStatus })
    });
    if (res.ok) {
      setIsOnline(newStatus);
      if (!newStatus) setIncomingRides([]);
    }
  };

  const saveVehicleDetailsAndGoOnline = async () => {
    if (!vehicleMake || !vehicleModel || !vehiclePlate) {
      Alert.alert('Missing Details', 'Please fill in all vehicle details.');
      return;
    }
    
    // 1. Save profile
    const profileRes = await fetchApi('/ride/driver/profile', {
      method: 'POST',
      body: JSON.stringify({ vehicleMake, vehicleModel, vehiclePlate })
    });
    
    if (profileRes.ok) {
      const updatedProfile = await profileRes.json();
      setProfile(updatedProfile);
      setIsSettingUpVehicle(false);
      
      // 2. Go online
      const statusRes = await fetchApi('/ride/driver/status', {
        method: 'POST',
        body: JSON.stringify({ isOnline: true })
      });
      if (statusRes.ok) {
        setIsOnline(true);
      }
    } else {
      Alert.alert('Error', 'Failed to save vehicle details.');
    }
  };

  const startLocationWatch = async (rideId: string) => {
    if (Platform.OS === 'web') return;
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    locationWatchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 3000 },
      (loc) => {
        rideSocket.updateLocation(loc.coords.latitude, loc.coords.longitude, rideId);
      }
    );
  };

  const stopLocationWatch = () => {
    locationWatchRef.current?.remove();
    locationWatchRef.current = null;
  };

  const acceptRide = async (rideId: string) => {
    const res = await fetchApi(`/ride/driver/accept/${rideId}`, { method: 'POST' });
    if (res.ok) {
      const ride = await res.json();
      setActiveRide(ride);
      setIncomingRides([]);
      rideSocket.joinRideRoom(ride.id);
      startLocationWatch(ride.id);
    } else {
      Alert.alert('Error', 'Ride might have been taken by another driver.');
      setIncomingRides(prev => prev.filter(r => r.id !== rideId));
    }
  };

  const completeRide = async () => {
    if (!activeRide) return;
    const res = await fetchApi(`/ride/driver/complete/${activeRide.id}`, { method: 'POST' });
    if (res.ok) {
      stopLocationWatch();
      setActiveRide(null);
      Alert.alert('Success', 'Ride completed successfully');
    }
  };

  const renderBottomSheet = () => {
    // --- Vehicle Setup ---
    if (isSettingUpVehicle) {
      return (
        <View style={[styles.bottomSheet, { paddingBottom: 30 }]}>
          <View style={styles.sheetHandle} />
          <Text style={[TYPOGRAPHY.h3, { marginBottom: 20 }]}>Vehicle Details</Text>
          <Text style={[TYPOGRAPHY.body2, { marginBottom: 15, color: COLORS.textMuted }]}>
            Since this is your first time going online, we need some details about your vehicle to show to riders.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Vehicle Make (e.g. Toyota)"
            placeholderTextColor={COLORS.textMuted}
            value={vehicleMake}
            onChangeText={setVehicleMake}
          />
          <TextInput
            style={styles.input}
            placeholder="Vehicle Model (e.g. Corolla)"
            placeholderTextColor={COLORS.textMuted}
            value={vehicleModel}
            onChangeText={setVehicleModel}
          />
          <TextInput
            style={styles.input}
            placeholder="License Plate (e.g. ABC 123 GP)"
            placeholderTextColor={COLORS.textMuted}
            value={vehiclePlate}
            onChangeText={setVehiclePlate}
            autoCapitalize="characters"
          />

          <View style={[styles.actionRow, { marginTop: 15 }]}>
            <TouchableOpacity
              style={[styles.declineBtn, { width: 50, paddingVertical: 12 }]}
              onPress={() => setIsSettingUpVehicle(false)}
            >
              <Ionicons name="close" size={24} color={COLORS.error} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.acceptBtn, { flex: 1, paddingVertical: 14 }]} onPress={saveVehicleDetailsAndGoOnline}>
              <Text style={styles.acceptBtnText}>Save & Go Online</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    // --- Active Ride ---
    if (activeRide) {
      return (
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={TYPOGRAPHY.caption}>ACTIVE RIDE</Text>
              <Text style={TYPOGRAPHY.h3}>En Route to Rider</Text>
            </View>
            <View style={styles.earningsBadge}>
              <Text style={styles.earningsText}>R{activeRide.fare}</Text>
            </View>
          </View>

          <View style={styles.tripDetailsCard}>
            <View style={styles.tripRow}>
              <View style={[styles.tripDot, { backgroundColor: COLORS.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={TYPOGRAPHY.caption}>PICKUP</Text>
                <Text style={TYPOGRAPHY.body1}>{activeRide.pickupAddress}</Text>
              </View>
            </View>
            <View style={styles.tripDotLine} />
            <View style={styles.tripRow}>
              <View style={[styles.tripDot, { backgroundColor: COLORS.secondary }]} />
              <View style={{ flex: 1 }}>
                <Text style={TYPOGRAPHY.caption}>DROPOFF</Text>
                <Text style={TYPOGRAPHY.body1}>{activeRide.dropoffAddress}</Text>
              </View>
            </View>
          </View>

          <View style={styles.riderInfo}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={22} color={COLORS.text} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={TYPOGRAPHY.h4}>{activeRide.rider?.username || 'Rider'}</Text>
              <Text style={TYPOGRAPHY.body2}>4.8 ★ Passenger</Text>
            </View>
            <TouchableOpacity style={styles.callBtn}>
              <Ionicons name="call" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.completeBtn} onPress={completeRide}>
            <Ionicons name="checkmark-circle" size={22} color={COLORS.text} style={{ marginRight: 8 }} />
            <Text style={styles.completeBtnText}>Complete Ride</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // --- Incoming Requests ---
    if (isOnline && incomingRides.length > 0) {
      const ride = incomingRides[0]; // Show the top request
      return (
        <View style={[styles.bottomSheet, { paddingBottom: 50 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.incomingHeader}>
            <View style={styles.pulseDot} />
            <Text style={[TYPOGRAPHY.h3, { marginLeft: 10 }]}>New Ride Request</Text>
          </View>

          <View style={styles.fareHighlight}>
            <Text style={styles.fareAmount}>R{ride.fare}</Text>
            <Text style={TYPOGRAPHY.body2}>Estimated fare</Text>
          </View>

          <View style={styles.tripDetailsCard}>
            <View style={styles.tripRow}>
              <View style={[styles.tripDot, { backgroundColor: COLORS.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={TYPOGRAPHY.caption}>PICKUP</Text>
                <Text style={TYPOGRAPHY.body1}>{ride.pickupAddress}</Text>
              </View>
            </View>
            <View style={styles.tripDotLine} />
            <View style={styles.tripRow}>
              <View style={[styles.tripDot, { backgroundColor: COLORS.secondary }]} />
              <View style={{ flex: 1 }}>
                <Text style={TYPOGRAPHY.caption}>DROPOFF</Text>
                <Text style={TYPOGRAPHY.body1}>{ride.dropoffAddress}</Text>
              </View>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={() => setIncomingRides(prev => prev.filter(r => r.id !== ride.id))}
            >
              <Ionicons name="close" size={22} color={COLORS.error} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptRide(ride.id)}>
              <Text style={styles.acceptBtnText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // --- Online / Waiting ---
    if (isOnline) {
      return (
        <View style={[styles.bottomSheet, { alignItems: 'center', paddingVertical: 35 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.onlineIndicator}>
            <View style={styles.onlineDot} />
            <Text style={[styles.onlineText, { marginLeft: 8 }]}>You're Online</Text>
          </View>
          <Text style={[TYPOGRAPHY.body2, { marginTop: 8, textAlign: 'center', marginBottom: 25 }]}>
            Waiting for ride requests in your area...
          </Text>
          <TouchableOpacity style={styles.goOfflineBtn} onPress={toggleOnlineStatus}>
            <Text style={styles.goOfflineBtnText}>GO OFFLINE</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // --- Offline ---
    return (
      <View style={[styles.bottomSheet, { alignItems: 'center', paddingVertical: 40 }]}>
        <View style={styles.sheetHandle} />
        <View style={styles.offlineIcon}>
          <Ionicons name="car-sport" size={36} color={COLORS.textMuted} />
        </View>
        <Text style={[TYPOGRAPHY.h3, { marginTop: 15, marginBottom: 8 }]}>You're Offline</Text>
        <Text style={[TYPOGRAPHY.body2, { textAlign: 'center', marginBottom: 28 }]}>
          Go online to start accepting ride requests.
        </Text>
        <TouchableOpacity style={styles.goOnlineBtn} onPress={toggleOnlineStatus}>
          <Ionicons name="power" size={20} color="#000" style={{ marginRight: 8 }} />
          <Text style={styles.goOnlineBtnText}>GO ONLINE</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Map background — falls back to dark grid on web */}
      {Platform.OS !== 'web' && MapView ? (
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={INITIAL_REGION}
          customMapStyle={mapStyle}
          showsUserLocation={true}
        >
          {activeRide && Marker && (
            <>
              <Marker
                coordinate={{ latitude: activeRide.pickupLat || -26.2041, longitude: activeRide.pickupLng || 28.0473 }}
                title="Pickup"
                pinColor={COLORS.primary}
              />
              <Marker
                coordinate={{ latitude: activeRide.dropoffLat || -26.1076, longitude: activeRide.dropoffLng || 28.0567 }}
                title="Dropoff"
                pinColor={COLORS.secondary}
              />
            </>
          )}
        </MapView>
      ) : (
        <View style={styles.mapFallback}>
          <View style={styles.mapGrid} />
          <View style={styles.mapOverlay} />
        </View>
      )}

      {/* Bottom Sheet */}
      <View style={styles.bottomSheetContainer}>
        {renderBottomSheet()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  mapFallback: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#1a2332',
  },
  mapGrid: {
    ...StyleSheet.absoluteFill,
    opacity: 0.15,
    backgroundImage: Platform.OS === 'web' ? 'linear-gradient(rgba(139,92,246,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.2) 1px, transparent 1px)' : undefined,
    backgroundSize: Platform.OS === 'web' ? '50px 50px' : undefined,
  } as any,
  mapOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7, 7, 12, 0.5)',
  },
  bottomSheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    ...SHADOW.glow,
  },
  bottomSheet: {
    backgroundColor: COLORS.surfaceElevated,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  earningsBadge: {
    backgroundColor: COLORS.primary + '25',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.primary + '60',
  },
  earningsText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 18,
  },
  tripDetailsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  tripDotLine: {
    width: 2,
    height: 16,
    backgroundColor: COLORS.border,
    marginLeft: 4,
    marginVertical: 4,
  },
  riderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeBtn: {
    backgroundColor: COLORS.success,
    padding: 16,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  completeBtnText: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  incomingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.secondary,
  },
  fareHighlight: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
  },
  fareAmount: {
    fontSize: 42,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  declineBtn: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.error + '20',
    borderWidth: 1,
    borderColor: COLORS.error + '50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: COLORS.secondary,
    padding: 16,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 18,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.success,
  },
  onlineText: {
    color: COLORS.success,
    fontWeight: 'bold',
    fontSize: 16,
  },
  goOfflineBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.error,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: RADIUS.pill,
  },
  goOfflineBtnText: {
    ...TYPOGRAPHY.button,
    color: COLORS.error,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: RADIUS.md,
    padding: 15,
    color: COLORS.text,
    fontSize: 16,
    marginBottom: 10,
    width: '100%'
  },
  offlineIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  goOnlineBtn: {
    backgroundColor: COLORS.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: RADIUS.pill,
  },
  goOnlineBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
});

// Dark theme map style
const mapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] },
];


