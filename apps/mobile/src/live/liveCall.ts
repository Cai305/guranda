// Native fallback — same reasoning as liveKit.ts: livekit-client needs
// browser WebRTC APIs not present in the RN JS engine on native. Callers
// check Platform.OS === 'web' first; this file only exists so `tsc` has a
// matching native module to resolve against.

export interface CallSession {
  room: any;
  cameraEnabled: boolean;
  disconnect: () => Promise<void>;
}

export async function connectToCall(
  _wsUrl: string,
  _token: string,
  _video: boolean,
  _onRemoteVideoTrack: (track: any) => void,
  _onRemoteAudioTrack: (track: any) => void,
  _onRemoteDisconnected: () => void,
): Promise<CallSession> {
  throw new Error('Calling is only available on web right now.');
}
