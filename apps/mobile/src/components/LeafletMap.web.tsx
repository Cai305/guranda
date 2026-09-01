// components/LeafletMap.web.tsx
// Web-only interactive map using Leaflet loaded from CDN.
// Metro will automatically prefer this file over LeafletMap.tsx for web bundles.

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';

// Leaflet is loaded from CDN at runtime — declare the global
declare global {
  interface Window { L: any; }
}

export interface Coord { lat: number; lng: number; }
export interface DriverPin { id: string; lat: number; lng: number; name: string; car?: string; }

interface Props {
  center?: Coord;
  /** This device's own current position — rendered as a pulsing "you are here" dot, always kept in sync while the screen is mounted. */
  selfCoord?: Coord | null;
  pickupCoord?: Coord | null;
  dropoffCoord?: Coord | null;
  driverPins?: DriverPin[];
  liveDriverCoord?: Coord | null;
  /** Live rider position — for DriverView's map, no turn-by-turn routing behind this, just a live pin. */
  riderCoord?: Coord | null;
  /** Path points to draw — real OSRM road geometry when available, otherwise a straight-line fallback (see routeIsApproximate). */
  route?: Coord[];
  /** True when `route` is the straight-line fallback (OSRM unavailable), not a real road route — drawn dashed instead of solid to say so honestly. */
  routeIsApproximate?: boolean;
  onMapTap?: (coord: Coord) => void;
  style?: any;
}

const LEAFLET_VER = '1.9.4';

// Injected once — Leaflet divIcons render as plain HTML, so animations live
// in a real stylesheet rather than inline styles (which can't declare
// @keyframes). Also covers the driver/rider live-position pulse, which
// referenced a "pulse-car" animation that was never actually defined.
const MAP_ANIMATIONS_ID = 'mxit-leaflet-animations';
function ensureMapAnimations() {
  if (typeof document === 'undefined' || document.getElementById(MAP_ANIMATIONS_ID)) return;
  const styleEl = document.createElement('style');
  styleEl.id = MAP_ANIMATIONS_ID;
  styleEl.textContent = `
    @keyframes mxit-self-pulse {
      0% { transform: scale(0.6); opacity: 0.55; }
      70% { transform: scale(1); opacity: 0; }
      100% { transform: scale(1); opacity: 0; }
    }
    @keyframes pulse-car {
      0% { transform: scale(1); }
      100% { transform: scale(1.12); }
    }
    .mxit-marker-pop { animation: mxit-marker-in 220ms ease-out; }
    @keyframes mxit-marker-in {
      0% { transform: scale(0.4); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
  `;
  document.head.appendChild(styleEl);
}

export default function LeafletMap({
  center = { lat: -26.2041, lng: 28.0473 },
  selfCoord,
  pickupCoord,
  dropoffCoord,
  driverPins = [],
  liveDriverCoord,
  riderCoord,
  route,
  routeIsApproximate,
  onMapTap,
  style,
}: Props) {
  const containerRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const selfRef = useRef<any>(null);
  const hasCenteredOnSelf = useRef(false);
  const pickupRef = useRef<any>(null);
  const dropoffRef = useRef<any>(null);
  const driverRefs = useRef<any[]>([]);
  const liveDriverRef = useRef<any>(null);
  const riderRef = useRef<any>(null);
  const routeRef = useRef<any>(null);
  const [ready, setReady] = useState(
    typeof window !== 'undefined' && !!window.L
  );
  const { theme } = useTheme();
  const { COLORS } = theme;
  const styles = useThemedStyles(({ COLORS }) => ({
    loading: {
      ...StyleSheet.absoluteFill,
      backgroundColor: '#1a2332',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
    },
    loadingText: {
      color: COLORS.textMuted,
      fontSize: 14,
      marginTop: 10,
    },
  }));

  // ── 1. Load Leaflet CSS + JS from CDN ───────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = `https://unpkg.com/leaflet@${LEAFLET_VER}/dist/leaflet.css`;
      document.head.appendChild(link);
    }

    if (window.L) { setReady(true); return; }

    let script = document.getElementById('leaflet-js') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = `https://unpkg.com/leaflet@${LEAFLET_VER}/dist/leaflet.js`;
      document.head.appendChild(script);
    }

    const onLoad = () => setReady(true);
    script.addEventListener('load', onLoad);
    return () => script!.removeEventListener('load', onLoad);
  }, []);

  // ── 2. Initialise map ────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;
    const L = window.L;
    ensureMapAnimations();

    // Fix default icon paths (broken when loaded from CDN without a bundler)
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: `https://unpkg.com/leaflet@${LEAFLET_VER}/dist/images/marker-icon.png`,
      iconRetinaUrl: `https://unpkg.com/leaflet@${LEAFLET_VER}/dist/images/marker-icon-2x.png`,
      shadowUrl: `https://unpkg.com/leaflet@${LEAFLET_VER}/dist/images/marker-shadow.png`,
    });

    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom: 13,
      attributionControl: false,
      zoomControl: true,
    });

    // Dark CartoDB tiles — free, no API key
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { maxZoom: 20 }
    ).addTo(map);

    L.control.attribution({ prefix: '© OSM & CARTO' }).addTo(map);

    if (onMapTap) {
      map.on('click', (e: any) =>
        onMapTap({ lat: e.latlng.lat, lng: e.latlng.lng })
      );
    }

    mapRef.current = map;
  }, [ready]);

  // ── 2b. Sync "you are here" marker ───────────────────────────────────────
  // The one thing this map was missing that the native MapView gets for
  // free via showsUserLocation — a real-time dot for this device's own
  // position, styled to match the familiar blue Google-Maps convention
  // (solid dot + soft pulsing accuracy ring) rather than reusing the
  // driver/rider emoji pins, which mean something different (the other
  // party in an active ride, not "me").
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    const L = window.L;
    if (selfRef.current) { selfRef.current.remove(); selfRef.current = null; }
    if (!selfCoord) return;

    const icon = L.divIcon({
      html: `
        <div style="position:relative;width:22px;height:22px;">
          <div style="position:absolute;inset:0;border-radius:50%;background:#4285F4;opacity:0.35;animation:mxit-self-pulse 1.8s ease-out infinite;"></div>
          <div style="position:absolute;top:5px;left:5px;width:12px;height:12px;border-radius:50%;background:#4285F4;border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.5);"></div>
        </div>
      `,
      iconSize: [22, 22], iconAnchor: [11, 11], className: '',
    });
    selfRef.current = L.marker([selfCoord.lat, selfCoord.lng], { icon, zIndexOffset: 1000 })
      .addTo(mapRef.current)
      .bindPopup('<b>You are here</b>');

    // Only auto-center the very first time a fix arrives and nothing else
    // has already framed the view (a pickup/dropoff pair, or fitBounds) —
    // after that, respect wherever the rider/driver has since panned to.
    if (!hasCenteredOnSelf.current && !pickupCoord && !dropoffCoord) {
      hasCenteredOnSelf.current = true;
      mapRef.current.setView([selfCoord.lat, selfCoord.lng], 15, { animate: true });
    }
  }, [selfCoord]);

  // ── 3. Sync pickup marker ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    const L = window.L;
    if (pickupRef.current) { pickupRef.current.remove(); pickupRef.current = null; }
    if (!pickupCoord) return;

    const icon = L.divIcon({
      html: `<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;background:#8B5CF6;border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,0.5);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(45deg);font-size:13px;">📍</span>
      </div>`,
      iconSize: [30, 30], iconAnchor: [15, 30], className: 'mxit-marker-pop',
    });
    pickupRef.current = L.marker([pickupCoord.lat, pickupCoord.lng], { icon, zIndexOffset: 500 })
      .addTo(mapRef.current)
      .bindPopup('<b>📍 Pickup</b>');
    mapRef.current.setView([pickupCoord.lat, pickupCoord.lng], 14, { animate: true });
  }, [pickupCoord]);

  // ── 4. Sync dropoff marker ───────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    const L = window.L;
    if (dropoffRef.current) { dropoffRef.current.remove(); dropoffRef.current = null; }
    if (!dropoffCoord) return;

    const icon = L.divIcon({
      html: `<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;background:#22D3EE;border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,0.5);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(45deg);font-size:13px;">🏁</span>
      </div>`,
      iconSize: [30, 30], iconAnchor: [15, 30], className: 'mxit-marker-pop',
    });
    dropoffRef.current = L.marker([dropoffCoord.lat, dropoffCoord.lng], { icon, zIndexOffset: 500 })
      .addTo(mapRef.current)
      .bindPopup('<b>🏁 Dropoff</b>');
  }, [dropoffCoord]);

  // ── 5. Fit bounds when both markers are present ──────────────────────────
  useEffect(() => {
    if (!mapRef.current || !window.L || !pickupCoord || !dropoffCoord) return;
    const L = window.L;
    const bounds = L.latLngBounds(
      [pickupCoord.lat, pickupCoord.lng],
      [dropoffCoord.lat, dropoffCoord.lng]
    );
    mapRef.current.fitBounds(bounds, { padding: [60, 60], animate: true });
  }, [pickupCoord, dropoffCoord]);

  // ── 6. Sync driver pins ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    const L = window.L;
    driverRefs.current.forEach(m => m.remove());
    driverRefs.current = driverPins.map(d => {
      const icon = L.divIcon({
        html: `<div style="width:30px;height:30px;border-radius:50%;background:#fff;border:2px solid ${COLORS.secondary};box-shadow:0 2px 6px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:15px;">🚗</div>`,
        iconSize: [30, 30], iconAnchor: [15, 15], className: 'mxit-marker-pop',
      });
      return L.marker([d.lat, d.lng], { icon })
        .addTo(mapRef.current)
        .bindPopup(`<b>${d.name}</b>${d.car ? `<br><small>${d.car}</small>` : ''}`);
    });
  }, [driverPins]);

  // ── 7. Live driver / delivery person marker ──────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    const L = window.L;
    if (liveDriverRef.current) { liveDriverRef.current.remove(); liveDriverRef.current = null; }
    if (!liveDriverCoord) return;
    const icon = L.divIcon({
      html: `<div style="width:34px;height:34px;border-radius:50%;background:${COLORS.warning};border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;font-size:17px;animation:pulse-car 0.9s ease-in-out infinite alternate;">🚗</div>`,
      iconSize: [34, 34], iconAnchor: [17, 17], className: '',
    });
    liveDriverRef.current = L.marker([liveDriverCoord.lat, liveDriverCoord.lng], { icon, zIndexOffset: 800 })
      .addTo(mapRef.current)
      .bindPopup('<b>🚗 Driver is here</b>');
    mapRef.current.panTo([liveDriverCoord.lat, liveDriverCoord.lng], { animate: true, duration: 0.5 });
  }, [liveDriverCoord]);

  // ── 7b. Live rider marker (for DriverView) ───────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    const L = window.L;
    if (riderRef.current) { riderRef.current.remove(); riderRef.current = null; }
    if (!riderCoord) return;
    const icon = L.divIcon({
      html: `<div style="width:30px;height:30px;border-radius:50%;background:${COLORS.warning};border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:15px;">🧍</div>`,
      iconSize: [30, 30], iconAnchor: [15, 15], className: 'mxit-marker-pop',
    });
    riderRef.current = L.marker([riderCoord.lat, riderCoord.lng], { icon, zIndexOffset: 800 })
      .addTo(mapRef.current)
      .bindPopup('<b>🧍 Rider</b>');
  }, [riderCoord]);

  // ── 7c. Route line — real OSRM road geometry when available, otherwise a
  // dashed straight-line fallback (routeIsApproximate) so the difference is
  // visible, never presented as if it were the real route ────────────────
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    const L = window.L;
    if (routeRef.current) { routeRef.current.remove(); routeRef.current = null; }
    if (!route || route.length < 2) return;
    routeRef.current = L.polyline(
      route.map(p => [p.lat, p.lng]),
      routeIsApproximate
        ? { color: '#8B5CF6', weight: 3, opacity: 0.7, dashArray: '6, 8' }
        : { color: '#8B5CF6', weight: 5, opacity: 0.9 },
    ).addTo(mapRef.current);
  }, [route, routeIsApproximate]);

  // ── 8. Cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, style]}>
      {/* Loading overlay */}
      {!ready && (
        <View style={styles.loading}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Loading map…</Text>
        </View>
      )}
      {/*
        @ts-ignore — <div> is valid in Expo web context.
        Leaflet requires a plain DOM element as its container.
      */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
    </View>
  );
}
