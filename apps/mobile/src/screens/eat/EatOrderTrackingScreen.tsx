import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { rideSocket } from '../../services/RideSocketService';
import { fetchApi } from '../../utils/api';

let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}

let LeafletMap: any = null;
if (Platform.OS === 'web') {
  LeafletMap = require('../../components/LeafletMap').default;
}

const INITIAL_REGION = {
  latitude: -26.2041,
  longitude: 28.0473,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const STATUS_STEPS = ['CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED'];
const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: 'Order confirmed',
  PREPARING: 'Preparing your order',
  READY: 'Ready for pickup',
  DELIVERING: 'On the way',
  DELIVERED: 'Delivered!',
};

export default function EatOrderTrackingScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const { orderId } = route.params;
  const [order, setOrder] = useState<any>(null);
  const [liveDriverCoord, setLiveDriverCoord] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    headerWrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: 10,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: { flex: 1, color: '#fff', fontWeight: '700', fontSize: 16, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
    mapFallback: { ...StyleSheet.absoluteFill, backgroundColor: '#1a2332' },
    mapGrid: {
      ...StyleSheet.absoluteFill,
      opacity: 0.15,
      backgroundImage: Platform.OS === 'web' ? 'linear-gradient(rgba(139,92,246,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.2) 1px, transparent 1px)' : undefined,
      backgroundSize: Platform.OS === 'web' ? '50px 50px' : undefined,
    } as any,
    mapOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(7,7,12,0.5)' },
    carMarker: { alignItems: 'center', justifyContent: 'center' },
    card: {
      position: 'absolute',
      bottom: 0, left: 0, right: 0,
      backgroundColor: COLORS.surfaceElevated,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: SPACING.lg,
      paddingBottom: 36,
      gap: 14,
    },
    progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    progressStep: { flexDirection: 'row', alignItems: 'center' },
    progressDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.border },
    progressLine: { width: 30, height: 2, backgroundColor: COLORS.border, marginHorizontal: 2 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444' },
    statusLabel: { ...TYPOGRAPHY.h3, color: COLORS.text },
    driverCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    driverAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#ef444420',
      justifyContent: 'center',
      alignItems: 'center',
    },
    driverName: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    driverSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
    liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#ef444420', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' },
    liveText: { color: '#ef4444', fontSize: 11, fontWeight: '800' },
    waitingCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: COLORS.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    waitingText: { color: COLORS.textMuted, fontSize: 13, flex: 1 },
    orderSummary: { gap: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: COLORS.border },
    summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    summaryText: { color: COLORS.textMuted, fontSize: 12, flex: 1 },
  }));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    fetchApi(`/eat/orders/${orderId}`)
      .then(r => r.json())
      .then(setOrder)
      .catch(() => {});
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const socket = await rideSocket.connect();
      if (cancelled || !socket) return;
      rideSocket.joinOrderRoom(orderId);
      rideSocket.onOrderLocationUpdated((payload) => {
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
    })();
    return () => {
      cancelled = true;
      rideSocket.offOrderLocationUpdated();
    };
  }, [orderId]);

  const currentStepIndex = order ? STATUS_STEPS.indexOf(order.status) : -1;

  const renderMap = () => {
    if (Platform.OS === 'web' && LeafletMap) {
      return (
        <LeafletMap
          center={liveDriverCoord || { lat: INITIAL_REGION.latitude, lng: INITIAL_REGION.longitude }}
          liveDriverCoord={liveDriverCoord}
        />
      );
    }
    if (Platform.OS !== 'web' && MapView) {
      return (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={INITIAL_REGION}
          showsUserLocation={true}
          customMapStyle={mapStyle}
        >
          {Marker && liveDriverCoord && (
            <Marker
              coordinate={{ latitude: liveDriverCoord.lat, longitude: liveDriverCoord.lng }}
              title="Delivery Driver"
              description="On the way to you"
            >
              <View style={styles.carMarker}>
                <Text style={{ fontSize: 24 }}>🚗</Text>
              </View>
            </Marker>
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

  return (
    <View style={styles.container}>
      {renderMap()}

      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.headerWrap}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Track Order</Text>
          <View style={{ width: 36 }} />
        </View>
      </SafeAreaView>

      {/* Bottom card */}
      <View style={styles.card}>
        {/* Status progress bar */}
        <View style={styles.progressRow}>
          {STATUS_STEPS.map((step, idx) => (
            <View key={step} style={styles.progressStep}>
              <View style={[
                styles.progressDot,
                idx <= currentStepIndex && { backgroundColor: '#ef4444' },
                idx === currentStepIndex && { transform: [{ scale: 1.3 }] },
              ]} />
              {idx < STATUS_STEPS.length - 1 && (
                <View style={[styles.progressLine, idx < currentStepIndex && { backgroundColor: '#ef4444' }]} />
              )}
            </View>
          ))}
        </View>

        {/* Current status */}
        <View style={styles.statusRow}>
          <Animated.View style={[styles.statusDot, { transform: [{ scale: pulseAnim }] }]} />
          <Text style={styles.statusLabel}>
            {order ? (STATUS_LABELS[order.status] || order.status) : 'Loading…'}
          </Text>
        </View>

        {/* Delivery person info */}
        {liveDriverCoord ? (
          <View style={styles.driverCard}>
            <View style={styles.driverAvatar}>
              <Text style={{ fontSize: 22 }}>🚗</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.driverName}>
                {order?.store?.name ? `${order.store.name} driver` : 'Delivery driver'}
              </Text>
              <Text style={styles.driverSub}>Location updating live</Text>
            </View>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
        ) : (
          <View style={styles.waitingCard}>
            <Ionicons name="bicycle-outline" size={24} color={COLORS.textMuted} />
            <Text style={styles.waitingText}>
              {order?.status === 'DELIVERING'
                ? 'Waiting for driver location…'
                : 'Driver will appear here once out for delivery'}
            </Text>
          </View>
        )}

        {/* Order summary */}
        {order && (
          <View style={styles.orderSummary}>
            <View style={styles.summaryRow}>
              <Ionicons name="storefront-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.summaryText}>{order.store?.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.summaryText} numberOfLines={1}>{order.deliveryAddress}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Ionicons name="receipt-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.summaryText}>R{order.total?.toFixed(2)} · {order.items?.length} item(s)</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const mapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
];
