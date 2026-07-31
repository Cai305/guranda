import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { COLORS, TYPOGRAPHY, RADIUS, SHADOW } from '../../../theme';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../../../utils/api';
import { rideSocket } from '../../../services/RideSocketService';
import { searchAddress, GeocodeSuggestion } from '../../../utils/geocoding';

// react-native-maps doesn't work on web — use a conditional import
let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}

// Leaflet map for web — uses Metro's platform-specific resolution (.web.tsx)
let LeafletMap: any = null;
if (Platform.OS === 'web') {
  LeafletMap = require('../../../components/LeafletMap').default;
}

// Mock Johannesburg coordinates
const INITIAL_REGION = {
  latitude: -26.2041,
  longitude: 28.0473,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

type RideState = 'IDLE' | 'SELECTING' | 'REQUESTING' | 'WAITING' | 'ACCEPTED' | 'IN_PROGRESS';
const VALID_RIDE_STATES: RideState[] = ['IDLE', 'SELECTING', 'REQUESTING', 'WAITING', 'ACCEPTED', 'IN_PROGRESS'];

// Dummy drivers always visible on the map
const DUMMY_DRIVERS = [
  { id: 'd1', name: 'Sipho M.', lat: -26.1980, lng: 28.0410, car: 'Toyota Corolla' },
  { id: 'd2', name: 'Thabo K.', lat: -26.2110, lng: 28.0560, car: 'VW Polo' },
];

export default function RiderView() {
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [pickupCoord, setPickupCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffCoord, setDropoffCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [rideState, setRideState] = useState<RideState>('IDLE');
  const [activeRide, setActiveRide] = useState<any>(null);
  const [liveDriverCoord, setLiveDriverCoord] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<any>(null);

  // Geocoding suggestions
  const [pickupSuggestions, setPickupSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [activeInput, setActiveInput] = useState<'pickup' | 'dropoff' | null>(null);
  const searchTimeout = useRef<any>(null);

  // ── Socket & active ride init ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const socket = await rideSocket.connect();
      if (cancelled || !socket) return;

      // Check for existing active ride
      try {
        const res = await fetchApi('/ride/rider/active-ride');
        if (res.ok) {
          const data = await res.json();
          if (data && !cancelled) {
            setActiveRide(data);
            const status = data.status as string;
            if (VALID_RIDE_STATES.includes(status as RideState)) {
              setRideState(status as RideState);
            }
            if (data.pickupLat && data.pickupLng) {
              setPickupCoord({ lat: data.pickupLat, lng: data.pickupLng });
              setPickup(data.pickupAddress || '');
            }
            if (data.dropoffLat && data.dropoffLng) {
              setDropoffCoord({ lat: data.dropoffLat, lng: data.dropoffLng });
              setDropoff(data.dropoffAddress || '');
            }
            rideSocket.joinRideRoom(data.id);
          }
        }
      } catch { /* server unreachable – stay in IDLE */ }

      // Register listeners — socket is guaranteed to exist here
      socket.on('rideAccepted', (ride: any) => {
        if (cancelled) return;
        setActiveRide(ride);
        setRideState('ACCEPTED');
        rideSocket.joinRideRoom(ride.id);
      });

      socket.on('rideCompleted', () => {
        if (cancelled) return;
        setRideState('IDLE');
        setActiveRide(null);
        setLiveDriverCoord(null);
        setPickup('');
        setDropoff('');
        setPickupCoord(null);
        setDropoffCoord(null);
        Alert.alert('Ride Completed', 'You have arrived at your destination.');
      });

      socket.on('driverLocationUpdated', (payload: { lat: number; lng: number }) => {
        if (cancelled) return;
        setLiveDriverCoord({ lat: payload.lat, lng: payload.lng });
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: payload.lat,
            longitude: payload.lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 800);
        }
      });
    };

    init();

    return () => {
      cancelled = true;
      rideSocket.socket?.off('rideAccepted');
      rideSocket.socket?.off('rideCompleted');
      rideSocket.socket?.off('driverLocationUpdated');
    };
  }, []);

  // ── Geocoding search with debounce ───────────────────────────────────────
  const handleLocationSearch = useCallback((text: string, type: 'pickup' | 'dropoff') => {
    if (type === 'pickup') {
      setPickup(text);
      setPickupCoord(null); // clear until user picks a suggestion
    } else {
      setDropoff(text);
      setDropoffCoord(null);
    }
    setActiveInput(type);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      const results = await searchAddress(text);
      if (type === 'pickup') setPickupSuggestions(results);
      else setDropoffSuggestions(results);
    }, 400);
  }, []);

  const selectSuggestion = (suggestion: GeocodeSuggestion, type: 'pickup' | 'dropoff') => {
    if (type === 'pickup') {
      setPickup(suggestion.shortName);
      setPickupCoord({ lat: suggestion.lat, lng: suggestion.lng });
      setPickupSuggestions([]);
    } else {
      setDropoff(suggestion.shortName);
      setDropoffCoord({ lat: suggestion.lat, lng: suggestion.lng });
      setDropoffSuggestions([]);
    }
    setActiveInput(null);
  };

  // ── Ride actions ─────────────────────────────────────────────────────────
  const proceedToSelection = () => {
    if (!pickup || !dropoff) {
      Alert.alert('Please enter pickup and dropoff locations');
      return;
    }
    if (!pickupCoord || !dropoffCoord) {
      Alert.alert('Select Locations', 'Please select a location from the suggestions for both pickup and dropoff.');
      return;
    }
    setRideState('SELECTING');
  };

  const requestRide = async () => {
    if (!pickupCoord || !dropoffCoord) return;
    setRideState('REQUESTING');
    try {
      const res = await fetchApi('/ride/rider/request', {
        method: 'POST',
        body: JSON.stringify({
          pickupLat: pickupCoord.lat, pickupLng: pickupCoord.lng, pickupAddress: pickup,
          dropoffLat: dropoffCoord.lat, dropoffLng: dropoffCoord.lng, dropoffAddress: dropoff,
          fare: 50.0
        })
      });
      if (res.ok) {
        const ride = await res.json();
        setActiveRide(ride);
        setRideState('WAITING');
        rideSocket.joinRideRoom(ride.id);
      } else {
        Alert.alert('Error requesting ride');
        setRideState('IDLE');
      }
    } catch {
      setRideState('IDLE');
    }
  };

  // ── Suggestion dropdown ──────────────────────────────────────────────────
  const renderSuggestions = (suggestions: GeocodeSuggestion[], type: 'pickup' | 'dropoff') => {
    if (suggestions.length === 0 || activeInput !== type) return null;
    return (
      <ScrollView style={styles.suggestionBox} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
        {suggestions.map((s, i) => (
          <TouchableOpacity
            key={`${type}-${i}`}
            style={styles.suggestionItem}
            onPress={() => selectSuggestion(s, type)}
          >
            <Ionicons name="location" size={16} color={COLORS.primary} style={{ marginRight: 8, marginTop: 2 }} />
            <Text style={styles.suggestionText} numberOfLines={2}>{s.shortName}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  // ── Bottom sheet states ──────────────────────────────────────────────────
  const renderBottomSheet = () => {
    switch (rideState) {
      case 'IDLE':
        return (
          <View style={styles.bottomSheet}>
            <Text style={[TYPOGRAPHY.h2, { marginBottom: 20 }]}>Where to?</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.dotLine}>
                <View style={styles.dot} />
                <View style={styles.line} />
                <View style={[styles.dot, { backgroundColor: COLORS.secondary }]} />
              </View>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={[styles.input, pickupCoord && styles.inputConfirmed]}
                  placeholder="Search pickup location..."
                  placeholderTextColor={COLORS.textMuted}
                  value={pickup}
                  onChangeText={(t) => handleLocationSearch(t, 'pickup')}
                  onFocus={() => setActiveInput('pickup')}
                />
                {renderSuggestions(pickupSuggestions, 'pickup')}
                <TextInput
                  style={[styles.input, { marginTop: 12 }, dropoffCoord && styles.inputConfirmed]}
                  placeholder="Search dropoff location..."
                  placeholderTextColor={COLORS.textMuted}
                  value={dropoff}
                  onChangeText={(t) => handleLocationSearch(t, 'dropoff')}
                  onFocus={() => setActiveInput('dropoff')}
                />
                {renderSuggestions(dropoffSuggestions, 'dropoff')}
              </View>
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, (!pickupCoord || !dropoffCoord) && styles.primaryBtnDisabled]}
              onPress={proceedToSelection}
              disabled={!pickupCoord || !dropoffCoord}
            >
              <Text style={styles.primaryBtnText}>Find a Ride</Text>
            </TouchableOpacity>
          </View>
        );

      case 'SELECTING':
        return (
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}>
              <Text style={TYPOGRAPHY.h3}>Choose a ride</Text>
              <TouchableOpacity onPress={() => setRideState('IDLE')}>
                <Ionicons name="close-circle" size={28} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.routeSummary}>
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, { backgroundColor: COLORS.primary }]} />
                <Text style={[TYPOGRAPHY.body2, { flex: 1, marginLeft: 10 }]} numberOfLines={1}>{pickup}</Text>
              </View>
              <View style={styles.routeDotLine} />
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, { backgroundColor: COLORS.secondary }]} />
                <Text style={[TYPOGRAPHY.body2, { flex: 1, marginLeft: 10 }]} numberOfLines={1}>{dropoff}</Text>
              </View>
            </View>

            <View style={styles.rideOptionRow}>
              <Ionicons name="car" size={40} color={COLORS.primary} style={{ marginRight: 15 }} />
              <View style={{ flex: 1 }}>
                <Text style={TYPOGRAPHY.h4}>Guranda Standard</Text>
                <Text style={TYPOGRAPHY.body2}>4 seats • 3 min</Text>
              </View>
              <Text style={TYPOGRAPHY.h3}>R50.00</Text>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={requestRide}>
              <Text style={styles.primaryBtnText}>Confirm Ride</Text>
            </TouchableOpacity>
          </View>
        );

      case 'REQUESTING':
      case 'WAITING':
        return (
          <View style={[styles.bottomSheet, { alignItems: 'center', paddingVertical: 40 }]}>
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginBottom: 20 }} />
            <Text style={TYPOGRAPHY.h3}>
              {rideState === 'REQUESTING' ? 'Requesting...' : 'Finding your driver...'}
            </Text>
            <Text style={[TYPOGRAPHY.body2, { marginTop: 10, textAlign: 'center' }]}>
              Please wait while we connect you with the nearest available driver.
            </Text>
          </View>
        );

      case 'ACCEPTED':
      case 'IN_PROGRESS':
        return (
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}>
              <Text style={TYPOGRAPHY.h3}>
                {rideState === 'ACCEPTED' ? 'Driver is arriving' : 'On your way!'}
              </Text>
              <View style={styles.etaBadge}>
                <Text style={styles.etaText}>3 MIN</Text>
              </View>
            </View>
            
            <View style={styles.driverInfoCard}>
              <View style={styles.driverAvatar}>
                <Ionicons name="person" size={24} color={COLORS.text} />
              </View>
              <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={TYPOGRAPHY.h4}>{activeRide?.driver?.username || 'Driver'}</Text>
                <Text style={TYPOGRAPHY.body2}>4.9 ★ • 1,204 rides</Text>
              </View>
              <View style={styles.carPlate}>
                <Text style={styles.plateText}>ABC 123 GP</Text>
                <Text style={TYPOGRAPHY.caption}>Toyota Corolla</Text>
              </View>
            </View>

            <View style={styles.rideDetails}>
              <Text style={TYPOGRAPHY.body1}>➔ {activeRide?.dropoffAddress}</Text>
            </View>
          </View>
        );

      default:
        // Fallback — show IDLE "Where to?" so the screen is never blank
        return (
          <View style={styles.bottomSheet}>
            <Text style={[TYPOGRAPHY.h2, { marginBottom: 20 }]}>Where to?</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setRideState('IDLE')}>
              <Text style={styles.primaryBtnText}>Start</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  // ── Map rendering ────────────────────────────────────────────────────────
  const renderMap = () => {
    const liveDriverPin = liveDriverCoord
      ? [{ id: 'live-driver', lat: liveDriverCoord.lat, lng: liveDriverCoord.lng, name: activeRide?.driver?.username || 'Driver', car: '🚗 En route' }]
      : [];

    if (Platform.OS === 'web' && LeafletMap) {
      return (
        <LeafletMap
          center={{ lat: INITIAL_REGION.latitude, lng: INITIAL_REGION.longitude }}
          pickupCoord={pickupCoord}
          dropoffCoord={dropoffCoord}
          driverPins={rideState === 'IDLE' ? DUMMY_DRIVERS : liveDriverPin}
        />
      );
    }

    if (Platform.OS !== 'web' && MapView) {
      return (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={INITIAL_REGION}
          customMapStyle={mapStyle}
          showsUserLocation={true}
        >
          {Marker && pickupCoord && (
            <Marker coordinate={{ latitude: pickupCoord.lat, longitude: pickupCoord.lng }} title="Pickup" pinColor={COLORS.primary} />
          )}
          {Marker && dropoffCoord && (
            <Marker coordinate={{ latitude: dropoffCoord.lat, longitude: dropoffCoord.lng }} title="Dropoff" pinColor={COLORS.secondary} />
          )}
          {Marker && rideState === 'IDLE' && DUMMY_DRIVERS.map(driver => (
            <Marker
              key={driver.id}
              coordinate={{ latitude: driver.lat, longitude: driver.lng }}
              title={driver.name}
              description={driver.car}
              pinColor={COLORS.secondary}
            />
          ))}
          {Marker && liveDriverCoord && (
            <Marker
              coordinate={{ latitude: liveDriverCoord.lat, longitude: liveDriverCoord.lng }}
              title={activeRide?.driver?.username || 'Driver'}
              description="On the way"
              pinColor="#f59e0b"
            />
          )}
        </MapView>
      );
    }

    // Fallback — no map available
    return (
      <View style={styles.mapFallback}>
        <View style={styles.mapGrid} />
        <View style={styles.mapOverlay} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderMap()}
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
    padding: 20,
    paddingBottom: 40,
  },
  inputWrapper: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  dotLine: {
    width: 20,
    alignItems: 'center',
    marginRight: 10,
    marginTop: 15,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  line: {
    width: 2,
    height: 45,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  input: {
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    padding: 16,
    borderRadius: RADIUS.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputConfirmed: {
    borderColor: COLORS.primary + '60',
  },
  suggestionBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    marginTop: 4,
    maxHeight: 150,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestionItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  suggestionText: {
    color: COLORS.text,
    fontSize: 14,
    flex: 1,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    padding: 18,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 18,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  routeSummary: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 15,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routeDotLine: {
    width: 2,
    height: 16,
    backgroundColor: COLORS.border,
    marginLeft: 3,
    marginVertical: 2,
  },
  rideOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 15,
  },
  driverInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: RADIUS.lg,
    marginBottom: 15,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carPlate: {
    alignItems: 'flex-end',
  },
  plateText: {
    color: COLORS.text,
    fontWeight: 'bold',
    backgroundColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 4,
  },
  etaBadge: {
    backgroundColor: COLORS.primary + '30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  etaText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  rideDetails: {
    padding: 10,
  }
});

// A standard dark theme map style (native only)
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
