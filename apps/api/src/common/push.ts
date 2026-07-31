import { Expo } from 'expo-server-sdk';

const expo = new Expo();

/** Sends one push notification. Returns false (and logs) if the token isn't a valid Expo push token or delivery fails. */
export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<boolean> {
  if (!Expo.isExpoPushToken(token)) {
    console.warn(`[push] Not a valid Expo push token, skipping: ${token}`);
    return false;
  }
  try {
    const [ticket] = await expo.sendPushNotificationsAsync([
      { to: token, title, body, data, sound: 'default' },
    ]);
    if (ticket.status === 'error') {
      console.warn(`[push] Delivery error: ${ticket.message}`);
      return false;
    }
    return true;
  } catch (e: any) {
    console.warn(`[push] Send failed: ${e.message}`);
    return false;
  }
}
