import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { fetchApi } from './api';

/** Gets a current GPS fix (requesting foreground permission if needed), or null if unavailable/declined. */
async function getCurrentPosition(): Promise<{ lat: number; lng: number } | null> {
  if (Platform.OS === 'web') return null;
  try {
    const { status: existing } = await Location.getForegroundPermissionsAsync();
    let status = existing;
    if (status !== 'granted') {
      const req = await Location.requestForegroundPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return null;

    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch (e) {
    console.error('Failed to get current position:', e);
    return null;
  }
}

/** Fetches the device's current GPS fix and syncs it to the backend so the AI companion always knows where the user is. */
export async function syncLocation(): Promise<void> {
  const pos = await getCurrentPosition();
  if (!pos) return;
  try {
    await fetchApi('/users/location', { method: 'POST', body: JSON.stringify(pos) });
  } catch (e) {
    console.error('Failed to sync location:', e);
  }
}
