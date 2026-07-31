import { Room, RoomEvent, Track, RemoteTrack, LocalVideoTrack } from 'livekit-client';

// Real WebRTC connection to the self-hosted LiveKit server. Web
// only for now — livekit-client relies on browser APIs
// (getUserMedia, RTCPeerConnection) not present in the RN JS
// engine on native.

export interface HostSession {
  room: Room;
  localVideoTrack: LocalVideoTrack | null;
  disconnect: () => Promise<void>;
}

export async function connectAsHost(
  wsUrl: string,
  token: string,
  onParticipantCountChange: (n: number) => void,
): Promise<HostSession> {
  const room = new Room({ adaptiveStream: true, dynacast: true });

  const reportCount = () => onParticipantCountChange(room.numParticipants + 1);
  room.on(RoomEvent.ParticipantConnected, reportCount);
  room.on(RoomEvent.ParticipantDisconnected, reportCount);

  await room.connect(wsUrl, token);
  await room.localParticipant.setCameraEnabled(true);
  await room.localParticipant.setMicrophoneEnabled(true);
  reportCount();

  const videoPub = Array.from(room.localParticipant.videoTrackPublications.values())[0];
  const localVideoTrack = (videoPub?.videoTrack as LocalVideoTrack | undefined) ?? null;

  return {
    room,
    localVideoTrack,
    disconnect: async () => {
      await room.localParticipant.setCameraEnabled(false);
      await room.localParticipant.setMicrophoneEnabled(false);
      room.disconnect();
    },
  };
}

export interface ViewerSession {
  room: Room;
  disconnect: () => void;
}

export async function connectAsViewer(
  wsUrl: string,
  token: string,
  onRemoteVideoTrack: (track: RemoteTrack | null) => void,
  onParticipantCountChange: (n: number) => void,
): Promise<ViewerSession> {
  const room = new Room({ adaptiveStream: true });

  const reportCount = () => onParticipantCountChange(room.numParticipants + 1);

  room.on(RoomEvent.TrackSubscribed, (track) => {
    if (track.kind === Track.Kind.Video) onRemoteVideoTrack(track);
  });
  room.on(RoomEvent.TrackUnsubscribed, (track) => {
    if (track.kind === Track.Kind.Video) onRemoteVideoTrack(null);
  });
  room.on(RoomEvent.ParticipantConnected, reportCount);
  room.on(RoomEvent.ParticipantDisconnected, reportCount);
  room.on(RoomEvent.Disconnected, () => onRemoteVideoTrack(null));

  await room.connect(wsUrl, token);
  reportCount();

  // Pick up any video track the host published before we subscribed.
  room.remoteParticipants.forEach(participant => {
    participant.videoTrackPublications.forEach(pub => {
      const track = pub.videoTrack as RemoteTrack | undefined;
      if (track) onRemoteVideoTrack(track);
    });
  });

  return {
    room,
    disconnect: () => room.disconnect(),
  };
}
