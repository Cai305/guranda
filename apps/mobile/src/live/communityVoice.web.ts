import { Room, RoomEvent, Track, RemoteParticipant } from 'livekit-client';

// Symmetric voice-channel session — unlike liveKit.web.ts's host/viewer
// split, every participant here both publishes (mic only, no camera) and
// subscribes to everyone else, matching a Discord/Slack-style voice channel.

export interface VoiceParticipant {
  identity: string;
  name: string;
}

export interface VoiceSession {
  room: Room;
  disconnect: () => Promise<void>;
  setMuted: (muted: boolean) => Promise<void>;
}

function makeAudioAttacher() {
  const elements = new Map<string, HTMLMediaElement>();
  return {
    attach: (trackId: string, track: any) => {
      const el = track.attach() as HTMLAudioElement;
      el.autoplay = true;
      document.body.appendChild(el);
      elements.set(trackId, el);
    },
    detach: (trackId: string) => {
      elements.get(trackId)?.remove();
      elements.delete(trackId);
    },
    clear: () => {
      elements.forEach((el) => el.remove());
      elements.clear();
    },
  };
}

export async function connectToVoiceChannel(
  wsUrl: string,
  token: string,
  onParticipantsChange: (participants: VoiceParticipant[]) => void,
): Promise<VoiceSession> {
  const room = new Room({ adaptiveStream: true });
  const audio = makeAudioAttacher();
  const nameOf = (p: RemoteParticipant) => p.name || p.identity;

  const reportParticipants = () => {
    const list: VoiceParticipant[] = [
      { identity: room.localParticipant.identity, name: room.localParticipant.name || 'You' },
      ...Array.from(room.remoteParticipants.values()).map((p) => ({ identity: p.identity, name: nameOf(p) })),
    ];
    onParticipantsChange(list);
  };

  room.on(RoomEvent.TrackSubscribed, (track, pub) => {
    if (track.kind === Track.Kind.Audio) audio.attach(pub.trackSid, track);
  });
  room.on(RoomEvent.TrackUnsubscribed, (_track, pub) => {
    audio.detach(pub.trackSid);
  });
  room.on(RoomEvent.ParticipantConnected, reportParticipants);
  room.on(RoomEvent.ParticipantDisconnected, reportParticipants);
  room.on(RoomEvent.Disconnected, () => audio.clear());

  await room.connect(wsUrl, token);
  await room.localParticipant.setMicrophoneEnabled(true);
  reportParticipants();

  room.remoteParticipants.forEach((participant) => {
    participant.audioTrackPublications.forEach((pub) => {
      if (pub.audioTrack) audio.attach(pub.trackSid, pub.audioTrack);
    });
  });

  return {
    room,
    setMuted: async (muted: boolean) => {
      await room.localParticipant.setMicrophoneEnabled(!muted);
    },
    disconnect: async () => {
      await room.localParticipant.setMicrophoneEnabled(false);
      room.disconnect();
    },
  };
}
