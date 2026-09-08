import { Expo } from 'expo-server-sdk';
import { PrismaService } from '../prisma.service';

const expo = new Expo();

/** Sends one push notification. Returns false (and logs) if the token isn't a valid Expo push token or delivery fails. */
export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
  opts?: { sound?: 'default' | null },
): Promise<boolean> {
  if (!Expo.isExpoPushToken(token)) {
    console.warn(`[push] Not a valid Expo push token, skipping: ${token}`);
    return false;
  }
  try {
    const [ticket] = await expo.sendPushNotificationsAsync([
      { to: token, title, body, data, sound: opts?.sound === null ? null : opts?.sound ?? 'default' },
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

// Every real category a push is ever sent under today — see Settings >
// Notifications and NotificationPreference. Kept as a literal list (not an
// enum) so a new module adding a push category is a one-line addition here,
// same convention as the rest of this codebase's string-typed status fields.
export type PushCategory =
  | 'messages'
  | 'calls'
  | 'social'
  | 'achievements'
  | 'reminders'
  | 'approvals'
  | 'games';

/**
 * The real per-category gate Settings > Notifications actually controls.
 * A missing NotificationPreference row (the common case — most users never
 * open Settings) means "everything on", matching every column's default, so
 * this never silently changes existing behavior for a user who hasn't
 * touched the toggle. Every call site that wants to respect user
 * preference should go through this instead of sendPushNotification
 * directly — see the 7 call sites already wired.
 */
export async function sendCategorizedPush(
  prisma: PrismaService,
  userId: string,
  category: PushCategory,
  token: string | null | undefined,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<boolean> {
  if (!token) return false;
  const prefs = await prisma.notificationPreference.findUnique({ where: { userId } });
  if (prefs && (!prefs.pushEnabled || !prefs[category])) return false;
  return sendPushNotification(token, title, body, data, {
    sound: prefs && !prefs.soundEnabled ? null : 'default',
  });
}
