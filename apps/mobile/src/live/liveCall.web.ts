import { Room, RoomEvent, Track, RemoteTrack } from 'livekit-client';

// Bidirectional sibling to liveKit.web.ts's connectAsHost/connectAsViewer —
// those are one-way (broadcast host, silent viewers); a call needs BOTH
// sides publishing (mic, camera if video) AND subscribing to the other
// participant's tracks in the same session.

export interface CallSession {
  room: Room;
  disconnect: () => Promise<void>;
}

export async function connectToCall(
  wsUrl: string,
  token: string,
  video: boolean,
  onRemoteVideoTrack: (track: RemoteTrack | null) => void,
  onRemoteAudioTrack: (track: RemoteTrack | null) => void,
  onRemoteDisconnected: () => void,
): Promise<CallSession> {
  const room = new Room({ adaptiveStream: true, dynacast: true });

  room.on(RoomEvent.TrackSubscribed, (track) => {
    if (track.kind === Track.Kind.Video) onRemoteVideoTrack(track as RemoteTrack);
    if (track.kind === Track.Kind.Audio) onRemoteAudioTrack(track as RemoteTrack);
  });
  room.on(RoomEvent.TrackUnsubscribed, (track) => {
    if (track.kind === Track.Kind.Video) onRemoteVideoTrack(null);
  });
  room.on(RoomEvent.ParticipantDisconnected, () => onRemoteDisconnected());
  room.on(RoomEvent.Disconnected, () => onRemoteDisconnected());

  await room.connect(wsUrl, token);
  await room.localParticipant.setMicrophoneEnabled(true);
  if (video) await room.localParticipant.setCameraEnabled(true);

  // Pick up anything the other participant already published before we
  // subscribed (they may have connected first while we were still ringing).
  room.remoteParticipants.forEach(participant => {
    participant.videoTrackPublications.forEach(pub => {
      if (pub.videoTrack) onRemoteVideoTrack(pub.videoTrack as RemoteTrack);
    });
    participant.audioTrackPublications.forEach(pub => {
      if (pub.audioTrack) onRemoteAudioTrack(pub.audioTrack as RemoteTrack);
    });
  });

  return {
    room,
    disconnect: async () => {
      await room.localParticipant.setMicrophoneEnabled(false);
      if (video) await room.localParticipant.setCameraEnabled(false);
      room.disconnect();
    },
  };
}
