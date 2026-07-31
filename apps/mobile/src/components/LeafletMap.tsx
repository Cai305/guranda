// components/LeafletMap.tsx
// Native fallback for LeafletMap — the real implementation lives in
// LeafletMap.web.tsx (Metro prefers .web.tsx on web builds).
// Native screens render react-native-maps instead, so this is never shown;
// it exists only so Metro can resolve the import on Android/iOS.

export interface Coord { lat: number; lng: number; }
export interface DriverPin { id: string; lat: number; lng: number; name: string; car?: string; }

export default function LeafletMap(_props: any) {
  return null;
}
