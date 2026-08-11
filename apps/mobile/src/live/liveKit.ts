// Native fallback: real camera-to-camera streaming currently only
// runs on web (livekit-client needs browser WebRTC APIs). On native
// this module is never actually invoked — callers check
// Platform.OS === 'web' first — but its exports must match
// liveKit.web.ts's signatures exactly, since `tsc` type-checks
// against this file (it doesn't do Metro's platform resolution).

export interface HostSession {
  room: any;
  localVideoTrack: any;
  disconnect: () => Promise<void>;
}

export interface ViewerSession {
  room: any;
  disconnect: () => void;
}

export async function connectAsHost(
  _wsUrl: string,
  _token: string,
  _onParticipantCountChange: (n: number) => void,
  _onRemoteVideoTrack: (identity: string, name: string, track: any) => void,
): Promise<HostSession> {
  throw new Error('Real camera streaming is only available on web right now.');
}

export async function connectAsViewer(
  _wsUrl: string,
  _token: string,
  _onRemoteVideoTrack: (identity: string, name: string, track: any) => void,
  _onParticipantCountChange: (n: number) => void,
): Promise<ViewerSession> {
  throw new Error('Real live video playback is only available on web right now.');
}

export async function becomeGuestPublisher(_room: any): Promise<any> {
  throw new Error('Real camera streaming is only available on web right now.');
}

export async function stopGuestPublishing(_room: any): Promise<void> {
  throw new Error('Real camera streaming is only available on web right now.');
}
