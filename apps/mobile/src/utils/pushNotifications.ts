import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { fetchApi } from './api';
import { navigate } from '../navigation/navigationRef';

// Foreground presentation — without this, notifications received while the
// app is open never show a banner/sound on some platforms.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Requests permission and returns an Expo push token, or null (web has no native push, or the user declined). */
async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync();
    return token;
  } catch (e) {
    console.error('Failed to register for push notifications:', e);
    return null;
  }
}

/** Registers this device for push (if needed) and syncs the token to the backend so AI reminders/wake-ups can reach it. */
export async function syncPushToken(): Promise<void> {
  const token = await registerForPushNotificationsAsync();
  if (!token) return;
  try {
    await fetchApi('/users/push-token', { method: 'POST', body: JSON.stringify({ token }) });
  } catch (e) {
    console.error('Failed to sync push token:', e);
  }
}

let responseListenerRegistered = false;

/** Deep-links a tapped push notification to the right in-app screen, by data.type. Safe to call more than once — only registers the OS listener the first time. */
export function registerNotificationResponseHandler(): void {
  if (Platform.OS === 'web' || responseListenerRegistered) return;
  responseListenerRegistered = true;
  Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data as Record<string, unknown> | undefined;
    if (data?.type === 'mcp_pending_action') {
      navigate('McpApprovals', { pendingActionId: data.pendingActionId });
    }
  });
}
