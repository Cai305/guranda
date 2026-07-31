// Lets screens outside the AiFloatingOrb component (tour completion, chat
// list, home tile) open the floating AI chat dropdown instead of pushing the
// full-screen AiChat route, which covers the tab bar and traps the user
// until they hit its back button. Same pattern as navigationRef.ts.
type Listener = () => void;
let listener: Listener | null = null;

export function registerAiOrbOpener(fn: Listener | null) {
  listener = fn;
}

export function openAiOrb() {
  listener?.();
}
