import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, TextInput, Animated, Easing } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { ThemeTokens } from '../../../theme/themes';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../../../utils/api';
import { formatCurrency } from '../../../utils/format';
import { rideSocket } from '../../../services/RideSocketService';
import { fetchRoute, haversineKm, RoutePoint } from '../../../utils/routing';
import PulsingRadar from '../../../components/PulsingRadar';
import * as Location from 'expo-location';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

// react-native-maps doesn't work on web — use a conditional import
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
}

// Leaflet map for web — uses Metro's platform-specific resolution (.web.tsx)
let LeafletMap: any = null;
if (Platform.OS === 'web') {
  LeafletMap = require('../../../components/LeafletMap').default;
}

const INITIAL_REGION = {
  latitude: -26.2041,
  longitude: 28.0473,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// How long an incoming request stays on screen before it's auto-declined —
// mirrors Uber Driver's countdown so a request doesn't sit forever.
const REQUEST_TIMEOUT_MS = 20000;

export default function DriverView({ navigation }: { navigation?: any }) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const styles = useThemedStyles(createDriverViewStyles);
  const [isOnline, setIsOnline] = useState(false);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [incomingRides, setIncomingRides] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [isSettingUpVehicle, setIsSettingUpVehicle] = useState(false);
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [selfLocation, setSelfLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [messaging, setMessaging] = useState(false);
  // Real road route for the active leg (→pickup, then →dropoff), fetched
  // from OSRM. Empty while loading/unavailable — renderMap() falls back to
  // a visually-distinct straight dashed line, never a fake road path.
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [routeUnavailable, setRouteUnavailable] = useState(false);
  const routedFromRef = useRef<RoutePoint | null>(null);
  const lastRouteFetchRef = useRef<number>(0);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
  const activeRideIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeRideIdRef.current = activeRide?.id ?? null;
    if (!activeRide) setRiderLocation(null);
    setArrived(false);
  }, [activeRide?.id]);

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

      socket.on('rideCancelled', (ride: any) => {
        if (cancelled) return;
        setActiveRide((prev: any) => (prev?.id === ride.id ? null : prev));
        Alert.alert('Ride Cancelled', 'The rider cancelled this ride.');
      });

      socket.on('riderLocationUpdated', (payload: { lat: number; lng: number }) => {
        if (cancelled) return;
        setRiderLocation({ lat: payload.lat, lng: payload.lng });
      });
    };

    init();

    return () => {
      cancelled = true;
      rideSocket.socket?.off('rideRequested');
      rideSocket.socket?.off('rideUnavailable');
      rideSocket.socket?.off('rideCancelled');
      rideSocket.socket?.off('riderLocationUpdated');
    };
  }, []);

  // Continuous location watch while online — independent of any active ride,
  // so the lobby/matching data (and this driver's own map pin) stay live.
  useEffect(() => {
    if (!isOnline || Platform.OS === 'web') {
      locationWatchRef.current?.remove();
      locationWatchRef.current = null;
      return;
    }
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;
      locationWatchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 3000 },
        (loc) => {
          setSelfLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
          rideSocket.updateDriverLocation(
            loc.coords.latitude,
            loc.coords.longitude,
            activeRideIdRef.current ?? undefined,
          );
        },
      );
    })();
    return () => { locationWatchRef.current?.remove(); locationWatchRef.current = null; };
  }, [isOnline]);

  // ── Real road route for the active leg ───────────────────────────────────
  // Heading to pickup: self → pickup. IN_PROGRESS: self → dropoff. Refetched
  // when this driver has moved meaningfully (>150m) or the last fetch is
  // stale (>20s) — not on every GPS tick, to stay a considerate client of
  // OSRM's free public router.
  useEffect(() => {
    if (!activeRide) {
      setRoutePoints([]);
      setRouteUnavailable(false);
      routedFromRef.current = null;
      return;
    }
    const pickupCoord = { lat: activeRide.pickupLat, lng: activeRide.pickupLng };
    const dropoffCoord = { lat: activeRide.dropoffLat, lng: activeRide.dropoffLng };
    const to = activeRide.status === 'IN_PROGRESS' ? dropoffCoord : pickupCoord;
    const from = selfLocation ?? pickupCoord;

    const movedFar = !routedFromRef.current || haversineKm(routedFromRef.current, from) > 0.15;
    const stale = Date.now() - lastRouteFetchRef.current > 20000;
    if (!movedFar && !stale && routePoints.length > 0) return;

    let cancelled = false;
    lastRouteFetchRef.current = Date.now();
    routedFromRef.current = from;
    fetchRoute(from, to).then((result) => {
      if (cancelled) return;
      if (result) {
        setRoutePoints(result.points);
        setRouteUnavailable(false);
      } else {
        setRouteUnavailable(true);
      }
    });
    return () => { cancelled = true; };
  }, [activeRide?.id, activeRide?.status, selfLocation]);

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

  const acceptRide = async (rideId: string) => {
    const res = await fetchApi(`/ride/driver/accept/${rideId}`, { method: 'POST' });
    if (res.ok) {
      const ride = await res.json();
      setActiveRide(ride);
      setIncomingRides([]);
      rideSocket.joinRideRoom(ride.id);
    } else {
      const data = await res.json().catch(() => null);
      Alert.alert('Error', data?.message || 'Ride might have been taken by another driver.');
      setIncomingRides(prev => prev.filter(r => r.id !== rideId));
    }
  };

  const declineRide = (rideId: string) => {
    setIncomingRides(prev => prev.filter(r => r.id !== rideId));
  };

  const startRide = async () => {
    if (!activeRide) return;
    setStarting(true);
    try {
      const res = await fetchApi(`/ride/driver/start/${activeRide.id}`, { method: 'POST' });
      if (res.ok) {
        setActiveRide(await res.json());
      } else {
        const data = await res.json().catch(() => null);
        Alert.alert('Error', data?.message || 'Could not start the ride.');
      }
    } finally {
      setStarting(false);
    }
  };

  const completeRide = async () => {
    if (!activeRide) return;
    const res = await fetchApi(`/ride/driver/complete/${activeRide.id}`, { method: 'POST' });
    if (res.ok) {
      setActiveRide(null);
      Alert.alert('Success', 'Ride completed successfully');
    } else {
      const data = await res.json().catch(() => null);
      Alert.alert('Error', data?.message || 'Could not complete the ride.');
    }
  };

  const cancelRide = async () => {
    if (!activeRide) return;
    setCancelling(true);
    try {
      const res = await fetchApi(`/ride/driver/cancel/${activeRide.id}`, { method: 'POST' });
      if (res.ok) {
        setActiveRide(null);
      } else {
        const data = await res.json().catch(() => null);
        Alert.alert('Could not cancel', data?.message || 'Please try again.');
      }
    } finally {
      setCancelling(false);
    }
  };

  // Opens (or creates) the real 1:1 chat thread with the rider — reuses the
  // app's existing chat system, not a stubbed "call" affordance.
  const messageRider = async () => {
    if (!navigation || !activeRide?.rider?.id || messaging) return;
    setMessaging(true);
    try {
      const res = await fetchApi('/chats', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: activeRide.rider.id }),
      });
      if (res.ok) {
        const chat = await res.json();
        navigation.navigate('Chat', {
          screen: 'ChatRoom',
          params: {
            roomId: chat.id,
            roomName: activeRide.rider.username || 'Rider',
            roomType: 'DIRECT',
            targetUserId: activeRide.rider.id,
          },
        });
      }
    } catch { /* non-critical */ }
    setMessaging(false);
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
      const inProgress = activeRide.status === 'IN_PROGRESS';
      const showStart = !inProgress && arrived;
      return (
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={TYPOGRAPHY.caption}>{inProgress ? 'TRIP IN PROGRESS' : 'HEADING TO PICKUP'}</Text>
              <Text style={TYPOGRAPHY.h3}>{inProgress ? 'On the way' : arrived ? 'Waiting for rider' : 'En Route to Rider'}</Text>
            </View>
            <View style={styles.earningsBadge}>
              <Text style={styles.earningsText}>{formatCurrency(activeRide.fare)}</Text>
            </View>
          </View>

          {routeUnavailable && (
            <Text style={[TYPOGRAPHY.caption, { marginBottom: 10 }]}>
              Road route unavailable right now — showing a direct line.
            </Text>
          )}

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
              <Text style={TYPOGRAPHY.body2}>Passenger</Text>
            </View>
            <TouchableOpacity style={styles.messageBtn} onPress={messageRider} disabled={messaging || !navigation}>
              <Ionicons name="chatbubble-ellipses" size={18} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {inProgress ? (
            <TouchableOpacity style={styles.completeBtn} onPress={completeRide}>
              <Ionicons name="checkmark-circle" size={22} color={COLORS.text} style={{ marginRight: 8 }} />
              <Text style={styles.completeBtnText}>Complete Trip</Text>
            </TouchableOpacity>
          ) : showStart ? (
            <TouchableOpacity style={styles.completeBtn} onPress={startRide} disabled={starting}>
              <Ionicons name="navigate" size={22} color={COLORS.text} style={{ marginRight: 8 }} />
              <Text style={styles.completeBtnText}>{starting ? 'Starting...' : 'Start Trip'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.arrivedBtn} onPress={() => setArrived(true)}>
              <Ionicons name="flag" size={20} color={COLORS.text} style={{ marginRight: 8 }} />
              <Text style={styles.completeBtnText}>I've Arrived</Text>
            </TouchableOpacity>
          )}

          {!inProgress && (
            <TouchableOpacity onPress={cancelRide} disabled={cancelling} style={{ marginTop: 12, alignItems: 'center' }}>
              <Text style={[TYPOGRAPHY.body2, { color: COLORS.textMuted }]}>
                {cancelling ? 'Cancelling...' : 'Cancel Ride'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    // --- Incoming Requests: full-screen takeover with countdown ---
    if (isOnline && incomingRides.length > 0) {
      const ride = incomingRides[0]; // Show the top request
      return (
        <IncomingRequestCard
          ride={ride}
          onAccept={() => acceptRide(ride.id)}
          onDecline={() => declineRide(ride.id)}
          onTimeout={() => declineRide(ride.id)}
        />
      );
    }

    // --- Online / Waiting ---
    if (isOnline) {
      return (
        <View style={[styles.bottomSheet, styles.onlineSheet]}>
          <View style={styles.sheetHandle} />
          <View style={styles.onlineIndicator}>
            <View style={styles.onlineDot} />
            <Text style={[styles.onlineText, { marginLeft: 8 }]}>You're Online</Text>
          </View>
          <Text style={[TYPOGRAPHY.body2, { marginTop: 6, textAlign: 'center' }]}>
            Looking for ride requests nearby...
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

  const renderMap = () => {
    const pickupCoord = activeRide ? { lat: activeRide.pickupLat, lng: activeRide.pickupLng } : null;
    const dropoffCoord = activeRide ? { lat: activeRide.dropoffLat, lng: activeRide.dropoffLng } : null;
    // Real OSRM road route when available (fetched in the effect above);
    // falls back to an honest straight dashed line while loading/unavailable
    // — never presented as if it were the real route.
    const straightFallback: { lat: number; lng: number }[] =
      activeRide && pickupCoord && dropoffCoord
        ? activeRide.status === 'IN_PROGRESS'
          ? [selfLocation ?? pickupCoord, dropoffCoord]
          : [selfLocation ?? pickupCoord, pickupCoord, dropoffCoord]
        : [];
    const hasRealRoute = routePoints.length > 1;
    const displayRoute = hasRealRoute ? routePoints : straightFallback;

    if (Platform.OS === 'web' && LeafletMap) {
      return (
        <LeafletMap
          center={selfLocation ?? { lat: INITIAL_REGION.latitude, lng: INITIAL_REGION.longitude }}
          pickupCoord={pickupCoord}
          dropoffCoord={dropoffCoord}
          liveDriverCoord={selfLocation}
          riderCoord={riderLocation}
          route={displayRoute.length > 1 ? displayRoute : undefined}
          routeIsApproximate={!hasRealRoute}
        />
      );
    }

    if (Platform.OS !== 'web' && MapView) {
      return (
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={selfLocation ? { latitude: selfLocation.lat, longitude: selfLocation.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 } : INITIAL_REGION}
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
          {Marker && riderLocation && (
            <Marker
              coordinate={{ latitude: riderLocation.lat, longitude: riderLocation.lng }}
              title="Rider"
              pinColor="#f59e0b"
            />
          )}
          {Polyline && displayRoute.length > 1 && (
            <Polyline
              coordinates={displayRoute.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
              strokeColor={COLORS.primary}
              strokeWidth={hasRealRoute ? 4 : 3}
              lineDashPattern={hasRealRoute ? undefined : [6, 8]}
            />
          )}
        </MapView>
      );
    }

    return (
      <View style={styles.mapFallback}>
        <View style={styles.mapGrid} />
        <View style={styles.mapOverlay} />
      </View>
    );
  };

  const showSearchingRadar = isOnline && !activeRide && incomingRides.length === 0 && !isSettingUpVehicle;
  // Ride is always presented inside the app's persistent bottom tab bar (not
  // a modal), so this absolutely-positioned sheet needs to clear it manually.
  let tabBarHeight = 0;
  try { tabBarHeight = useBottomTabBarHeight(); } catch { /* not mounted under a tab navigator */ }

  return (
    <View style={styles.container}>
      {renderMap()}
      {showSearchingRadar && (
        <View style={styles.radarWrap}>
          <PulsingRadar color={COLORS.secondary} />
        </View>
      )}

      {/* Bottom Sheet */}
      <View style={[styles.bottomSheetContainer, { bottom: tabBarHeight }]}>
        {renderBottomSheet()}
      </View>
    </View>
  );
}

// ── Full-screen incoming-request takeover, Uber Driver-style ────────────────
// A shrinking timer bar auto-declines the request if the driver doesn't
// respond in time, so a stale request never sits on screen indefinitely.
function IncomingRequestCard({ ride, onAccept, onDecline, onTimeout }: {
  ride: any; onAccept: () => void; onDecline: () => void; onTimeout: () => void;
}) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const styles = useThemedStyles(createDriverViewStyles);
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    progress.setValue(1);
    const anim = Animated.timing(progress, {
      toValue: 0,
      duration: REQUEST_TIMEOUT_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    anim.start(({ finished }) => { if (finished) onTimeout(); });
    return () => anim.stop();
  }, [ride.id]);

  return (
    <View style={styles.incomingOverlay}>
      <View style={styles.timerTrack}>
        <Animated.View
          style={[
            styles.timerFill,
            { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
          ]}
        />
      </View>

      <View style={styles.incomingHeader}>
        <View style={styles.pulseDot} />
        <Text style={[TYPOGRAPHY.h3, { marginLeft: 10 }]}>New Ride Request</Text>
      </View>

      <View style={styles.fareHighlight}>
        <Text style={styles.fareAmount}>{formatCurrency(ride.fare)}</Text>
        <Text style={TYPOGRAPHY.body2}>Estimated fare · {ride.distanceKm != null ? `${ride.distanceKm.toFixed(1)} km` : ''}</Text>
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
        <TouchableOpacity style={styles.declineBtn} onPress={onDecline}>
          <Ionicons name="close" size={22} color={COLORS.error} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
          <Text style={styles.acceptBtnText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createDriverViewStyles({ COLORS, TYPOGRAPHY, RADIUS, SHADOW, SPACING }: ThemeTokens) {
  return StyleSheet.create({
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
  radarWrap: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    alignItems: 'center',
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
  onlineSheet: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
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
  messageBtn: {
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
  arrivedBtn: {
    backgroundColor: COLORS.primary,
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
  // ── Incoming request takeover ──────────────────────────────────────────
  incomingOverlay: {
    backgroundColor: COLORS.surfaceElevated,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  timerTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  timerFill: {
    height: 4,
    backgroundColor: COLORS.secondary,
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
    marginTop: SPACING.lg,
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
}

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
