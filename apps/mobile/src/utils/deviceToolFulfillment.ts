import * as Contacts from 'expo-contacts';
import * as Calendar from 'expo-calendar';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Clipboard from 'expo-clipboard';
import * as Battery from 'expo-battery';
import * as Device from 'expo-device';

// The device.* AI tools (apps/api/src/device/device-ai-tools.provider.ts)
// read/write data that only exists on the phone, not in Guranda's database.
// Their server-side handlers just echo back whatever `input.deviceData`
// they're given — the real native work happens here, client-side, in the
// window between the user tapping "Approve" on the pending-action card and
// the app POSTing /ai/resolve (see AiConversationContext.resolveAction).
export async function fulfillDeviceTool(toolName: string, input: any): Promise<any> {
  switch (toolName) {
    case 'device.contactsSearch':
      return { ...input, deviceData: await searchContacts(input.query) };
    case 'device.calendarRead':
      return { ...input, deviceData: await readCalendarEvents(input.days) };
    case 'device.calendarCreate':
      return { ...input, deviceData: await createCalendarEvent(input) };
    case 'device.photosRecent':
      return { ...input, deviceData: await recentPhotos(input.count) };
    case 'device.clipboardRead':
      return { ...input, deviceData: await readClipboard() };
    case 'device.clipboardWrite':
      return { ...input, deviceData: await writeClipboard(input.text) };
    case 'device.batteryStatus':
      return { ...input, deviceData: await batteryStatus() };
    case 'device.info':
      return { ...input, deviceData: deviceInfo() };
    default:
      return input;
  }
}

// Exported for direct reuse by the "share contact" flow in ChatScreen.tsx —
// same underlying Contacts API call the AI companion's contacts tool uses,
// just invoked directly instead of via the AI pending-action flow.
export async function searchContacts(query: string) {
  const perm = await Contacts.requestPermissionsAsync();
  if (!perm.granted) return { contacts: [], permissionDenied: true };

  const details = await Contacts.Contact.getAllDetails(
    [Contacts.ContactField.FULL_NAME, Contacts.ContactField.PHONES],
    { limit: 500 },
  );
  const q = (query || '').trim().toLowerCase();
  const contacts = details
    .filter((c: any) => !q || (c.fullName || '').toLowerCase().includes(q))
    .slice(0, 20)
    .map((c: any) => ({
      name: c.fullName || 'Unknown',
      phoneNumbers: (c.phones || []).map((p: any) => p.number).filter(Boolean),
    }));
  return { contacts };
}

async function readCalendarEvents(days?: number) {
  const perm = await Calendar.requestCalendarPermissions();
  if (!perm.granted) return { events: [], permissionDenied: true };

  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  const start = new Date();
  const end = new Date(start.getTime() + (days || 7) * 24 * 60 * 60 * 1000);
  const results = await Promise.all(
    calendars.map((cal: any) => cal.listEvents(start, end).catch(() => [])),
  );
  const events = results
    .flat()
    .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 25)
    .map((e: any) => ({
      title: e.title,
      startDate: e.startDate,
      endDate: e.endDate,
      location: e.location || null,
    }));
  return { events };
}

async function createCalendarEvent(input: any) {
  const perm = await Calendar.requestCalendarPermissions();
  if (!perm.granted) return { created: false, permissionDenied: true };

  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  const target = calendars.find((c: any) => c.allowsModifications) || calendars[0];
  if (!target) return { created: false };

  await target.createEvent({
    title: input.title,
    startDate: new Date(input.startTime),
    endDate: new Date(input.endTime),
    location: input.location,
    notes: input.notes,
  });
  return { created: true };
}

async function recentPhotos(count?: number) {
  const perm = await MediaLibrary.requestPermissionsAsync();
  if (!perm.granted) return { photos: [], permissionDenied: true };

  const result = await MediaLibrary.getAssetsAsync({
    mediaType: MediaLibrary.MediaType.photo,
    sortBy: MediaLibrary.SortBy.creationTime,
    first: count || 10,
  });
  const photos = result.assets.map((a: any) => ({
    filename: a.filename,
    creationTime: a.creationTime,
  }));
  return { photos };
}

async function readClipboard() {
  const result = await Clipboard.getStringAsync();
  return { text: result || null };
}

async function writeClipboard(text: string) {
  const written = await Clipboard.setStringAsync(text);
  return { written };
}

async function batteryStatus() {
  const [level, state] = await Promise.all([
    Battery.getBatteryLevelAsync(),
    Battery.getBatteryStateAsync(),
  ]);
  const stateMap: Record<number, string> = {
    [Battery.BatteryState.UNKNOWN]: 'unknown',
    [Battery.BatteryState.UNPLUGGED]: 'unplugged',
    [Battery.BatteryState.CHARGING]: 'charging',
    [Battery.BatteryState.FULL]: 'full',
    [Battery.BatteryState.NOT_CHARGING]: 'not_charging',
  };
  return {
    level: Math.round(level * 100),
    state: stateMap[state] || 'unknown',
  };
}

function deviceInfo() {
  return {
    modelName: Device.modelName,
    osName: Device.osName,
    osVersion: Device.osVersion,
  };
}
