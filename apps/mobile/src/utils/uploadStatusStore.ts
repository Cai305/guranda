// Plain external store (same pattern as navigationRef/aiOrbBridge) so
// uploadMedia() and any raw-fetch upload screen — neither of which are React
// components — can report progress/success/failure into one place that a
// single globally-mounted overlay subscribes to. This is what makes "every
// upload gets a progress bar and a result alert" possible without touching
// each of the 15+ screens that upload something: they keep calling
// uploadMedia()/uploadImage() exactly as before and get this for free.

export interface UploadStatusItem {
  id: string;
  label: string;
  percent: number; // 0-100, meaningful while state === 'uploading'
  state: 'uploading' | 'success' | 'warning' | 'error';
  message?: string;
}

type Listener = () => void;

const listeners = new Set<Listener>();
let items: UploadStatusItem[] = [];
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeUploadStatus(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getUploadStatusSnapshot(): UploadStatusItem[] {
  return items;
}

function clearTimer(id: string) {
  const t = timers.get(id);
  if (t) {
    clearTimeout(t);
    timers.delete(id);
  }
}

export function startUpload(label: string): string {
  const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  items = [...items, { id, label, percent: 0, state: 'uploading' }];
  emit();
  return id;
}

export function updateUploadProgress(id: string, percent: number) {
  items = items.map((i) => (i.id === id ? { ...i, percent } : i));
  emit();
}

// All bytes are sent once upload progress hits 100%, but the request is
// still waiting on the server's response (which itself waits on the
// slower, more variable Supabase round-trip) — without this the overlay
// sits at a static "100%" with no sign anything is still happening, which
// reads as a hang even when the upload is genuinely still in flight.
export function markUploadFinishing(id: string, label = 'Finishing up…') {
  items = items.map((i) => (i.id === id ? { ...i, label, percent: 100 } : i));
  emit();
}

function removeAfter(id: string, delayMs: number) {
  clearTimer(id);
  timers.set(
    id,
    setTimeout(() => {
      items = items.filter((i) => i.id !== id);
      timers.delete(id);
      emit();
    }, delayMs),
  );
}

export function finishUpload(id: string, message = 'Upload complete') {
  items = items.map((i) =>
    i.id === id ? { ...i, state: 'success', percent: 100, message } : i,
  );
  emit();
  removeAfter(id, 2200);
}

export function warnUpload(id: string, message: string) {
  items = items.map((i) => (i.id === id ? { ...i, state: 'warning', message } : i));
  emit();
  removeAfter(id, 3500);
}

export function failUpload(id: string, message = 'Upload failed') {
  items = items.map((i) => (i.id === id ? { ...i, state: 'error', message } : i));
  emit();
  removeAfter(id, 4500);
}

// Fire-and-forget notice with no associated progress bar — for validation
// failures caught before an upload even starts (missing title, no file
// picked, etc). Alert.alert is a no-op on web, so this is the only reliable
// way to surface these there.
export function notify(state: 'success' | 'warning' | 'error', message: string) {
  const id = `notice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  items = [...items, { id, label: message, percent: 100, state, message }];
  emit();
  removeAfter(id, state === 'error' ? 4500 : 3000);
}
