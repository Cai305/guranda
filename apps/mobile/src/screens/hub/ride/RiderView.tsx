import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { COLORS, TYPOGRAPHY, RADIUS, SHADOW, SPACING } from '../../../theme';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../../../utils/api';
import { formatCurrency } from '../../../utils/format';
import { rideSocket } from '../../../services/RideSocketService';
import { searchAddress, GeocodeSuggestion } from '../../../utils/geocoding';
import { fetchRoute, haversineKm, RoutePoint } from '../../../utils/routing';
import PulsingRadar from '../../../components/PulsingRadar';
import * as Location from 'expo-location';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

// Mock Johannesburg coordinates — fallback if the device won't share a real location
const INITIAL_REGION = {
  latitude: -26.2041,
  longitude: 28.0473,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// SEARCH is a UI-only step (never comes back from the server) — it sits
// between IDLE and SELECTING while the rider is picking pickup/dropoff.
type RideState = 'IDLE' | 'SEARCH' | 'SELECTING' | 'REQUESTING' | 'WAITING' | 'ACCEPTED' | 'IN_PROGRESS';
const VALID_SERVER_STATES: RideState[] = ['REQUESTING', 'WAITING', 'ACCEPTED', 'IN_PROGRESS'];

type NearbyDriver = { userId: string; lat: number; lng: number; vehicleModel?: string | null; rating?: number; isOnline?: boolean };
type FareEstimate = { distanceKm: number; fare: number; etaMinutes: number };

export default function RiderView({ navigation }: { navigation?: any }) {
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [pickupCoord, setPickupCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffCoord, setDropoffCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [rideState, setRideState] = useState<RideState>('IDLE');
  const [activeRide, setActiveRide] = useState<any>(null);
  const [liveDriverCoord, setLiveDriverCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [deviceLocation, setDeviceLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyDrivers, setNearbyDrivers] = useState<NearbyDriver[]>([]);
  const [fareEstimate, setFareEstimate] = useState<FareEstimate | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [ratingRideId, setRatingRideId] = useState<string | null>(null);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [messaging, setMessaging] = useState(false);
  // Real road route for the active leg (driver→pickup, then pickup→dropoff),
  // fetched from OSRM. Empty while loading/unavailable — renderMap() falls
  // back to a visually-distinct straight dashed line, never a fake road path.
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [routeEtaMin, setRouteEtaMin] = useState<number | null>(null);
  const [routeUnavailable, setRouteUnavailable] = useState(false);
  const routedFromRef = useRef<RoutePoint | null>(null);
  const lastRouteFetchRef = useRef<number>(0);
  const mapRef = useRef<any>(null);
  const riderLocationWatchRef = useRef<Location.LocationSubscription | null>(null);

  // Geocoding suggestions
  const [pickupSuggestions, setPickupSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [activeInput, setActiveInput] = useState<'pickup' | 'dropoff' | null>(null);
  const searchTimeout = useRef<any>(null);

  const mapCenter = deviceLocation ?? { lat: INITIAL_REGION.latitude, lng: INITIAL_REGION.longitude };
  // Ride is always presented inside the app's persistent bottom tab bar (not
  // a modal), so absolutely-positioned overlays need to clear it manually.
  let tabBarHeight = 0;
  try { tabBarHeight = useBottomTabBarHeight(); } catch { /* not mounted under a tab navigator */ }
  // RideScreen renders its own floating minimize/exit + Rider/Driver toggle
  // at `insets.top + 20`, roughly 44px tall — the search sheet's own header
  // needs to start clear of that.
  const insets = useSafeAreaInsets();
  const searchTopPadding = Math.max(insets.top, 20) + 60;

  // ── Real device location (best-effort — falls back to the mock region) ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const loc = await Location.getCurrentPositionAsync({});
        if (!cancelled) setDeviceLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } catch { /* stay on the mock region */ }
    })();
    return () => { cancelled = true; };
  }, []);

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
            if (VALID_SERVER_STATES.includes(status as RideState)) {
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

      socket.on('rideStarted', (ride: any) => {
        if (cancelled) return;
        setActiveRide(ride);
        setRideState('IN_PROGRESS');
      });

      socket.on('rideCompleted', (ride: any) => {
        if (cancelled) return;
        setRatingRideId(ride?.id ?? null);
        setRideState('IDLE');
        setActiveRide(null);
        setLiveDriverCoord(null);
        setPickup('');
        setDropoff('');
        setPickupCoord(null);
        setDropoffCoord(null);
        setFareEstimate(null);
      });

      socket.on('rideCancelled', (ride: any) => {
        if (cancelled) return;
        setRideState('IDLE');
        setActiveRide(null);
        setLiveDriverCoord(null);
        setFareEstimate(null);
        Alert.alert(
          'Ride Cancelled',
          ride?.cancelledBy === 'DRIVER' ? 'Your driver cancelled the ride.' : 'The ride was cancelled.',
        );
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

      socket.on('onlineDriversUpdated', (payload: NearbyDriver) => {
        if (cancelled) return;
        setNearbyDrivers((prev) => {
          if (payload.isOnline === false) return prev.filter((d) => d.userId !== payload.userId);
          const idx = prev.findIndex((d) => d.userId === payload.userId);
          const merged = { ...(idx >= 0 ? prev[idx] : { userId: payload.userId }), ...payload };
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = merged;
            return next;
          }
          return [...prev, merged];
        });
      });
    };

    init();

    return () => {
      cancelled = true;
      rideSocket.socket?.off('rideAccepted');
      rideSocket.socket?.off('rideStarted');
      rideSocket.socket?.off('rideCompleted');
      rideSocket.socket?.off('rideCancelled');
      rideSocket.socket?.off('driverLocationUpdated');
      rideSocket.socket?.off('onlineDriversUpdated');
      riderLocationWatchRef.current?.remove();
    };
  }, []);

  // ── Lobby membership + nearby-driver seed while idle ─────────────────────
  useEffect(() => {
    if (rideState !== 'IDLE' && rideState !== 'SEARCH' && rideState !== 'SELECTING') return;
    rideSocket.joinLobby();
    fetchApi(`/ride/drivers/nearby?lat=${mapCenter.lat}&lng=${mapCenter.lng}`, {
      headers: { 'Cache-Control': 'no-cache' },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((drivers) => setNearbyDrivers(Array.isArray(drivers) ? drivers : []))
      .catch(() => {});
    return () => { rideSocket.leaveLobby(); };
  }, [rideState, mapCenter.lat, mapCenter.lng]);

  // ── Fare estimate as soon as both coords are set ─────────────────────────
  useEffect(() => {
    if (!pickupCoord || !dropoffCoord) { setFareEstimate(null); return; }
    let cancelled = false;
    fetchApi(
      `/ride/fare-estimate?pickupLat=${pickupCoord.lat}&pickupLng=${pickupCoord.lng}&dropoffLat=${dropoffCoord.lat}&dropoffLng=${dropoffCoord.lng}`,
      { headers: { 'Cache-Control': 'no-cache' } },
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((est) => { if (!cancelled) setFareEstimate(est); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [pickupCoord, dropoffCoord]);

  // ── Rider's own live location, once a driver is on the way ───────────────
  useEffect(() => {
    if (!activeRide || (rideState !== 'ACCEPTED' && rideState !== 'IN_PROGRESS')) {
      riderLocationWatchRef.current?.remove();
      riderLocationWatchRef.current = null;
      return;
    }
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;
      riderLocationWatchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 3000 },
        (loc) => rideSocket.updateRiderLocation(loc.coords.latitude, loc.coords.longitude, activeRide.id),
      );
    })();
    return () => { riderLocationWatchRef.current?.remove(); riderLocationWatchRef.current = null; };
  }, [activeRide?.id, rideState]);

  // ── Real road route for the active leg ───────────────────────────────────
  // ACCEPTED: driver's live position → pickup. IN_PROGRESS: → dropoff.
  // Refetched when the driver has moved meaningfully (>150m) or the last
  // fetch is stale (>20s) — not on every GPS tick, to stay a considerate
  // client of OSRM's free public router.
  useEffect(() => {
    if (rideState !== 'ACCEPTED' && rideState !== 'IN_PROGRESS') {
      setRoutePoints([]);
      setRouteEtaMin(null);
      setRouteUnavailable(false);
      routedFromRef.current = null;
      return;
    }
    if (!pickupCoord || !dropoffCoord) return;
    const to = rideState === 'ACCEPTED' ? pickupCoord : dropoffCoord;
    const from = liveDriverCoord ?? pickupCoord;

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
        setRouteEtaMin(Math.ceil(result.durationMin));
        setRouteUnavailable(false);
      } else {
        setRouteUnavailable(true);
      }
    });
    return () => { cancelled = true; };
  }, [rideState, liveDriverCoord, pickupCoord, dropoffCoord]);

  // ── Entering search: default pickup to the device's current location ────
  // (Uber-style — the rider almost never needs to type their own pickup.)
  useEffect(() => {
    if (rideState !== 'SEARCH') return;
    if (!pickupCoord && deviceLocation) {
      setPickup('Current Location');
      setPickupCoord(deviceLocation);
    }
  }, [rideState, deviceLocation]);

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
      // The other side was already picked — move straight to ride options,
      // matching Uber's "pick destination and go" fluid flow.
      if (dropoffCoord) setRideState('SELECTING');
    } else {
      setDropoff(suggestion.shortName);
      setDropoffCoord({ lat: suggestion.lat, lng: suggestion.lng });
      setDropoffSuggestions([]);
      if (pickupCoord) setRideState('SELECTING');
    }
    setActiveInput(null);
  };

  // ── Ride actions ─────────────────────────────────────────────────────────
  const openSearch = () => setRideState('SEARCH');

  const requestRide = async () => {
    if (!pickupCoord || !dropoffCoord) return;
    setRideState('REQUESTING');
    try {
      // Fare is computed server-side from the coordinates — never sent from here.
      const res = await fetchApi('/ride/rider/request', {
        method: 'POST',
        body: JSON.stringify({
          pickupLat: pickupCoord.lat, pickupLng: pickupCoord.lng, pickupAddress: pickup,
          dropoffLat: dropoffCoord.lat, dropoffLng: dropoffCoord.lng, dropoffAddress: dropoff,
        })
      });
      if (res.ok) {
        const ride = await res.json();
        setActiveRide(ride);
        setRideState('WAITING');
        rideSocket.joinRideRoom(ride.id);
      } else {
        const data = await res.json().catch(() => null);
        Alert.alert('Error requesting ride', data?.message || undefined);
        setRideState('SELECTING');
      }
    } catch {
      setRideState('SELECTING');
    }
  };

  const cancelRide = async () => {
    if (!activeRide) return;
    setCancelling(true);
    try {
      const res = await fetchApi(`/ride/rider/cancel/${activeRide.id}`, { method: 'POST' });
      if (res.ok) {
        setRideState('IDLE');
        setActiveRide(null);
        setLiveDriverCoord(null);
        setFareEstimate(null);
      } else {
        const data = await res.json().catch(() => null);
        Alert.alert('Could not cancel', data?.message || 'Please try again.');
      }
    } finally {
      setCancelling(false);
    }
  };

  const submitRating = async (rating: number) => {
    if (!ratingRideId) return;
    setSubmittingRating(true);
    try {
      await fetchApi(`/ride/rider/rate/${ratingRideId}`, {
        method: 'POST',
        body: JSON.stringify({ rating }),
      });
    } catch { /* not critical if this fails silently */ }
    setSubmittingRating(false);
    setRatingRideId(null);
  };

  // Opens (or creates) the real 1:1 chat thread with the assigned driver —
  // reuses the app's existing chat system, not a stubbed "call" affordance.
  const messageDriver = async () => {
    if (!navigation || !activeRide?.driver?.id || messaging) return;
    setMessaging(true);
    try {
      const res = await fetchApi('/chats', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: activeRide.driver.id }),
      });
      if (res.ok) {
        const chat = await res.json();
        navigation.navigate('Chat', {
          screen: 'ChatRoom',
          params: {
            roomId: chat.id,
            roomName: activeRide.driver.username || 'Driver',
            roomType: 'DIRECT',
            targetUserId: activeRide.driver.id,
          },
        });
      }
    } catch { /* non-critical */ }
    setMessaging(false);
  };

  // ── Suggestion list (full-width rows, Uber-style) ────────────────────────
  const renderSuggestionList = (suggestions: GeocodeSuggestion[], type: 'pickup' | 'dropoff') => {
    if (activeInput !== type || suggestions.length === 0) return null;
    return (
      <ScrollView style={styles.suggestionList} keyboardShouldPersistTaps="handled">
        {suggestions.map((s, i) => (
          <TouchableOpacity
            key={`${type}-${i}`}
            style={styles.suggestionRow}
            onPress={() => selectSuggestion(s, type)}
          >
            <View style={styles.suggestionIconWrap}>
              <Ionicons name="location-outline" size={18} color={COLORS.textMuted} />
            </View>
            <Text style={styles.suggestionText} numberOfLines={2}>{s.shortName}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  // ── Rating modal ─────────────────────────────────────────────────────────
  const renderRatingModal = () => {
    if (!ratingRideId) return null;
    return (
      <View style={styles.ratingOverlay}>
        <View style={styles.ratingCard}>
          <Text style={[TYPOGRAPHY.h3, { marginBottom: 6 }]}>Ride completed!</Text>
          <Text style={[TYPOGRAPHY.body2, { marginBottom: 20 }]}>How was your driver?</Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} disabled={submittingRating} onPress={() => submitRating(n)} style={{ padding: 6 }}>
                <Ionicons name="star" size={36} color={COLORS.primary} />
              </TouchableOpacity>
            ))}
          </View>
          {submittingRating ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 10 }} />
          ) : (
            <TouchableOpacity onPress={() => setRatingRideId(null)} style={{ marginTop: 16 }}>
              <Text style={[TYPOGRAPHY.body2, { color: COLORS.textMuted }]}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ── IDLE: compact "Where to?" pill — the map does the talking ───────────
  const renderIdleBar = () => (
    <View style={styles.idleBarWrap}>
      <TouchableOpacity style={styles.whereToPill} onPress={openSearch} activeOpacity={0.85}>
        <View style={styles.whereToIconWrap}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
        </View>
        <Text style={styles.whereToText}>Where to?</Text>
      </TouchableOpacity>
    </View>
  );

  // ── SEARCH: full-screen pickup/dropoff sheet ─────────────────────────────
  const renderSearchSheet = () => (
    <View style={[styles.searchSheet, { paddingTop: searchTopPadding }]}>
      <View style={styles.searchHeader}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setRideState('IDLE')}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[TYPOGRAPHY.h3, { marginLeft: 8 }]}>Plan your ride</Text>
      </View>

      <View style={styles.inputWrapper}>
        <View style={styles.dotLine}>
          <View style={styles.dot} />
          <View style={styles.line} />
          <View style={[styles.dot, { backgroundColor: COLORS.secondary }]} />
        </View>
        <View style={{ flex: 1 }}>
          <TextInput
            style={[styles.input, pickupCoord && styles.inputConfirmed]}
            placeholder="Pickup location"
            placeholderTextColor={COLORS.textMuted}
            value={pickup}
            onChangeText={(t) => handleLocationSearch(t, 'pickup')}
            onFocus={() => setActiveInput('pickup')}
          />
          {renderSuggestionList(pickupSuggestions, 'pickup')}
          <TextInput
            style={[styles.input, { marginTop: 12 }, dropoffCoord && styles.inputConfirmed]}
            placeholder="Where to?"
            placeholderTextColor={COLORS.textMuted}
            value={dropoff}
            onChangeText={(t) => handleLocationSearch(t, 'dropoff')}
            onFocus={() => setActiveInput('dropoff')}
            autoFocus={!!pickupCoord}
          />
          {renderSuggestionList(dropoffSuggestions, 'dropoff')}
        </View>
      </View>

      {activeInput === null && (
        <Text style={[TYPOGRAPHY.caption, { marginTop: 4 }]}>
          Select a pickup and a destination to see ride options.
        </Text>
      )}
    </View>
  );

  // ── SELECTING: Uber-style ride option list ───────────────────────────────
  const renderRideOptions = () => (
    <View style={styles.bottomSheet}>
      <View style={styles.sheetHeader}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setRideState('SEARCH')}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h3}>Choose a ride</Text>
        <View style={{ width: 36 }} />
      </View>

      <TouchableOpacity style={styles.routeSummary} onPress={() => setRideState('SEARCH')} activeOpacity={0.8}>
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: COLORS.primary }]} />
          <Text style={[TYPOGRAPHY.body2, { flex: 1, marginLeft: 10 }]} numberOfLines={1}>{pickup}</Text>
        </View>
        <View style={styles.routeDotLine} />
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: COLORS.secondary }]} />
          <Text style={[TYPOGRAPHY.body2, { flex: 1, marginLeft: 10 }]} numberOfLines={1}>{dropoff}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.optionList}>
        <View style={[styles.optionRow, styles.optionRowSelected]}>
          <View style={styles.optionIconWrap}>
            <Ionicons name="car-sport" size={26} color={COLORS.text} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={TYPOGRAPHY.h4}>Guranda Standard</Text>
            <Text style={TYPOGRAPHY.body2}>
              {fareEstimate ? `${fareEstimate.distanceKm.toFixed(1)} km · ${fareEstimate.etaMinutes} min away` : 'Calculating...'}
            </Text>
          </View>
          {fareEstimate ? (
            <Text style={TYPOGRAPHY.h3}>{formatCurrency(fareEstimate.fare)}</Text>
          ) : (
            <ActivityIndicator color={COLORS.primary} />
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, !fareEstimate && styles.primaryBtnDisabled]}
        onPress={requestRide}
        disabled={!fareEstimate}
      >
        <Text style={styles.primaryBtnText}>
          {fareEstimate ? `Confirm · ${formatCurrency(fareEstimate.fare)}` : 'Confirm Ride'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // ── REQUESTING / WAITING: matching animation ─────────────────────────────
  const renderMatching = () => (
    <View style={[styles.bottomSheet, styles.matchingSheet]}>
      <ActivityIndicator size="small" color={COLORS.primary} style={{ marginBottom: 12 }} />
      <Text style={TYPOGRAPHY.h4}>
        {rideState === 'REQUESTING' ? 'Requesting your ride...' : 'Looking for nearby drivers...'}
      </Text>
      <Text style={[TYPOGRAPHY.body2, { marginTop: 6, textAlign: 'center' }]}>
        We'll notify you as soon as a driver accepts.
      </Text>
      <TouchableOpacity onPress={cancelRide} disabled={cancelling} style={{ marginTop: 16 }}>
        <Text style={[TYPOGRAPHY.body2, { color: COLORS.textMuted, textDecorationLine: 'underline' }]}>
          {cancelling ? 'Cancelling...' : 'Cancel'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // ── ACCEPTED / IN_PROGRESS: compact driver trip card ─────────────────────
  const renderTripCard = () => (
    <View style={styles.bottomSheet}>
      <View style={styles.etaPill}>
        <Ionicons name="time-outline" size={14} color={COLORS.primary} />
        <Text style={styles.etaPillText}>
          {rideState === 'ACCEPTED'
            ? `Driver arriving${routeEtaMin ?? fareEstimate?.etaMinutes ? ` in ${routeEtaMin ?? fareEstimate?.etaMinutes} min` : ''}`
            : 'On your way'}
        </Text>
      </View>
      {routeUnavailable && (
        <Text style={[TYPOGRAPHY.caption, { marginTop: -10, marginBottom: 10 }]}>
          Road route unavailable right now — showing a direct line.
        </Text>
      )}

      <View style={styles.driverInfoCard}>
        <View style={styles.driverAvatar}>
          <Ionicons name="person" size={26} color={COLORS.text} />
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={TYPOGRAPHY.h4}>{activeRide?.driver?.username || 'Driver'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <Ionicons name="star" size={13} color={COLORS.gold} />
            <Text style={[TYPOGRAPHY.body2, { marginLeft: 4 }]}>
              {(activeRide?.driverProfile?.rating ?? 5).toFixed(1)} · {activeRide?.driverProfile?.totalRides ?? 0} rides
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.messageBtn} onPress={messageDriver} disabled={messaging || !navigation}>
          {messaging ? (
            <ActivityIndicator size="small" color={COLORS.text} />
          ) : (
            <Ionicons name="chatbubble-ellipses" size={18} color={COLORS.text} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.vehiclePlateRow}>
        <Text style={TYPOGRAPHY.body2}>{activeRide?.driverProfile?.vehicleModel || 'Vehicle'}</Text>
        <View style={styles.plateChip}>
          <Text style={styles.plateChipText}>{activeRide?.driverProfile?.vehiclePlate || '—'}</Text>
        </View>
      </View>

      <View style={styles.destinationRow}>
        <Ionicons name="location" size={16} color={COLORS.secondary} />
        <Text style={[TYPOGRAPHY.body1, { flex: 1, marginLeft: 8 }]} numberOfLines={1}>{activeRide?.dropoffAddress}</Text>
        {!!activeRide?.fare && <Text style={TYPOGRAPHY.body2}>{formatCurrency(activeRide.fare)}</Text>}
      </View>

      {rideState === 'ACCEPTED' && (
        <TouchableOpacity onPress={cancelRide} disabled={cancelling} style={{ marginTop: 14, alignItems: 'center' }}>
          <Text style={[TYPOGRAPHY.body2, { color: COLORS.textMuted }]}>
            {cancelling ? 'Cancelling...' : 'Cancel Ride'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderBottomContent = () => {
    switch (rideState) {
      case 'IDLE': return renderIdleBar();
      case 'SEARCH': return renderSearchSheet();
      case 'SELECTING': return renderRideOptions();
      case 'REQUESTING':
      case 'WAITING': return renderMatching();
      case 'ACCEPTED':
      case 'IN_PROGRESS': return renderTripCard();
      default: return renderIdleBar();
    }
  };

  // ── Map rendering ────────────────────────────────────────────────────────
  const renderMap = () => {
    const liveDriverPin = liveDriverCoord
      ? [{ id: 'live-driver', lat: liveDriverCoord.lat, lng: liveDriverCoord.lng, name: activeRide?.driver?.username || 'Driver', car: '🚗 En route' }]
      : [];
    const idleDriverPins = nearbyDrivers.map((d) => ({
      id: d.userId,
      lat: d.lat,
      lng: d.lng,
      name: 'Driver nearby',
      car: d.vehicleModel || undefined,
    }));
    const showIdlePins = rideState === 'IDLE' || rideState === 'SEARCH' || rideState === 'SELECTING';

    // Real OSRM road route when available (fetched in the effect above);
    // falls back to an honest straight dashed line while loading/unavailable
    // — never presented as if it were the real route.
    const straightFallback: { lat: number; lng: number }[] =
      rideState === 'ACCEPTED' && pickupCoord && dropoffCoord
        ? [liveDriverCoord ?? pickupCoord, pickupCoord, dropoffCoord]
        : rideState === 'IN_PROGRESS' && dropoffCoord
        ? [liveDriverCoord ?? dropoffCoord, dropoffCoord]
        : [];
    const hasRealRoute = routePoints.length > 1;
    const displayRoute = hasRealRoute ? routePoints : straightFallback;

    if (Platform.OS === 'web' && LeafletMap) {
      return (
        <LeafletMap
          center={{ lat: mapCenter.lat, lng: mapCenter.lng }}
          pickupCoord={pickupCoord}
          dropoffCoord={dropoffCoord}
          driverPins={showIdlePins ? idleDriverPins : liveDriverPin}
          route={displayRoute.length > 1 ? displayRoute : undefined}
          routeIsApproximate={!hasRealRoute}
        />
      );
    }

    if (Platform.OS !== 'web' && MapView) {
      return (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={deviceLocation ? { latitude: deviceLocation.lat, longitude: deviceLocation.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 } : INITIAL_REGION}
          customMapStyle={mapStyle}
          showsUserLocation={true}
        >
          {Marker && pickupCoord && (
            <Marker coordinate={{ latitude: pickupCoord.lat, longitude: pickupCoord.lng }} title="Pickup" pinColor={COLORS.primary} />
          )}
          {Marker && dropoffCoord && (
            <Marker coordinate={{ latitude: dropoffCoord.lat, longitude: dropoffCoord.lng }} title="Dropoff" pinColor={COLORS.secondary} />
          )}
          {Marker && showIdlePins && nearbyDrivers.map((driver) => (
            <Marker
              key={driver.userId}
              coordinate={{ latitude: driver.lat, longitude: driver.lng }}
              title="Driver nearby"
              description={driver.vehicleModel || undefined}
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
      {(rideState === 'REQUESTING' || rideState === 'WAITING') && (
        <View style={styles.radarWrap}>
          <PulsingRadar />
        </View>
      )}
      <View
        style={[
          rideState === 'SEARCH' ? styles.searchSheetContainer : styles.bottomSheetContainer,
          rideState === 'SEARCH' ? { paddingBottom: tabBarHeight } : { bottom: tabBarHeight },
        ]}
      >
        {renderBottomContent()}
      </View>
      {renderRatingModal()}
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
  radarWrap: {
    position: 'absolute',
    top: '28%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  // ── IDLE compact pill ────────────────────────────────────────────────────
  // Not absolutely positioned — its parent (bottomSheetContainer) already is,
  // offset above the persistent tab bar, so this just fills that naturally.
  idleBarWrap: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  whereToPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.pill,
    paddingVertical: 16,
    paddingHorizontal: 18,
    ...SHADOW.glow,
  },
  whereToIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  whereToText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },

  // ── SEARCH full-screen sheet ─────────────────────────────────────────────
  searchSheetContainer: {
    ...StyleSheet.absoluteFill,
  },
  searchSheet: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    paddingTop: SPACING.xxl,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
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
  suggestionList: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    marginTop: 6,
    maxHeight: 320,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  suggestionIconWrap: {
    width: 28,
    alignItems: 'center',
    marginTop: 1,
  },
  suggestionText: {
    color: COLORS.text,
    fontSize: 14,
    flex: 1,
  },

  // ── Bottom sheet (SELECTING / matching / trip card) ──────────────────────
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
    paddingBottom: 36,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  routeSummary: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 14,
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
  optionList: {
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionRowSelected: {
    backgroundColor: COLORS.primary + '18',
    borderColor: COLORS.primary + '60',
  },
  optionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    padding: 18,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 17,
  },

  // ── Matching (REQUESTING / WAITING) ───────────────────────────────────────
  matchingSheet: {
    alignItems: 'center',
    paddingVertical: 28,
  },

  // ── Trip card (ACCEPTED / IN_PROGRESS) ────────────────────────────────────
  etaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary + '20',
    borderRadius: RADIUS.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  etaPillText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 6,
  },
  driverInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehiclePlateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  plateChip: {
    backgroundColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
  },
  plateChipText: {
    color: COLORS.text,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },

  // ── Rating modal ──────────────────────────────────────────────────────────
  ratingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  ratingCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.xl,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  starRow: {
    flexDirection: 'row',
  },
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
