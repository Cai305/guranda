// Native fallback — real audio-only voice channels currently only run on
// web (livekit-client needs browser WebRTC APIs). Callers check
// Platform.OS === 'web' first; this file's exports must match
// communityVoice.web.ts's signatures exactly since tsc type-checks against
// this one (it doesn't do Metro's platform resolution).

export interface VoiceParticipant {
  identity: string;
  name: string;
}

export interface VoiceSession {
  room: any;
  disconnect: () => Promise<void>;
  setMuted: (muted: boolean) => Promise<void>;
}

export async function connectToVoiceChannel(
  _wsUrl: string,
  _token: string,
  _onParticipantsChange: (participants: VoiceParticipant[]) => void,
): Promise<VoiceSession> {
  throw new Error('Voice channels are only available on web right now.');
}
