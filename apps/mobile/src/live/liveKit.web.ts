import { Room, RoomEvent, Track, RemoteTrack, LocalVideoTrack, RemoteParticipant } from 'livekit-client';

// Real WebRTC connection to the self-hosted LiveKit server. Web
// only for now — livekit-client relies on browser APIs
// (getUserMedia, RTCPeerConnection) not present in the RN JS
// engine on native.
//
// Both host and viewer sessions can now see MULTIPLE simultaneous remote
// camera feeds (the host + any accepted guests all publish), not just one —
// onRemoteVideoTrack fires per participant, keyed by their LiveKit identity
// (== userId, since mintToken sets identity=userId), with track=null
// signaling that participant's video went away (unpublished/disconnected).

type RemoteVideoCallback = (identity: string, name: string, track: RemoteTrack | null) => void;

// Audio has no visual to render, so every session (host or viewer) just
// attaches it straight to a real HTMLAudioElement kept alive in the DOM.
function makeAudioAttacher() {
  const elements = new Set<HTMLMediaElement>();
  return {
    attach: (track: RemoteTrack) => {
      const el = track.attach() as HTMLAudioElement;
      el.autoplay = true;
      document.body.appendChild(el);
      elements.add(el);
    },
    detach: (track: RemoteTrack) => {
      track.detach().forEach(el => { el.remove(); elements.delete(el); });
    },
    clear: () => {
      elements.forEach(el => el.remove());
      elements.clear();
    },
  };
}

function wireRemoteTracks(room: Room, onRemoteVideoTrack: RemoteVideoCallback) {
  const audio = makeAudioAttacher();
  const nameOf = (p: RemoteParticipant) => p.name || p.identity;

  room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
    if (track.kind === Track.Kind.Video) onRemoteVideoTrack(participant.identity, nameOf(participant), track);
    else if (track.kind === Track.Kind.Audio) audio.attach(track);
  });
  room.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
    if (track.kind === Track.Kind.Video) onRemoteVideoTrack(participant.identity, nameOf(participant), null);
    else if (track.kind === Track.Kind.Audio) audio.detach(track);
  });
  room.on(RoomEvent.ParticipantDisconnected, (participant) => {
    onRemoteVideoTrack(participant.identity, nameOf(participant), null);
  });
  room.on(RoomEvent.Disconnected, () => audio.clear());

  // Pick up any tracks published before we subscribed.
  room.remoteParticipants.forEach(participant => {
    participant.videoTrackPublications.forEach(pub => {
      const track = pub.videoTrack as RemoteTrack | undefined;
      if (track) onRemoteVideoTrack(participant.identity, nameOf(participant), track);
    });
    participant.audioTrackPublications.forEach(pub => {
      const track = pub.audioTrack as RemoteTrack | undefined;
      if (track) audio.attach(track);
    });
  });
}

export interface HostSession {
  room: Room;
  localVideoTrack: LocalVideoTrack | null;
  disconnect: () => Promise<void>;
}

export async function connectAsHost(
  wsUrl: string,
  token: string,
  onParticipantCountChange: (n: number) => void,
  onRemoteVideoTrack: RemoteVideoCallback,
): Promise<HostSession> {
  const room = new Room({ adaptiveStream: true, dynacast: true });

  const reportCount = () => onParticipantCountChange(room.numParticipants + 1);
  room.on(RoomEvent.ParticipantConnected, reportCount);
  room.on(RoomEvent.ParticipantDisconnected, reportCount);
  // The host also sees any guests already/later on stage with them.
  wireRemoteTracks(room, onRemoteVideoTrack);

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
  onRemoteVideoTrack: RemoteVideoCallback,
  onParticipantCountChange: (n: number) => void,
): Promise<ViewerSession> {
  const room = new Room({ adaptiveStream: true });

  const reportCount = () => onParticipantCountChange(room.numParticipants + 1);
  room.on(RoomEvent.ParticipantConnected, reportCount);
  room.on(RoomEvent.ParticipantDisconnected, reportCount);
  wireRemoteTracks(room, onRemoteVideoTrack);

  await room.connect(wsUrl, token);
  reportCount();

  return {
    room,
    disconnect: () => room.disconnect(),
  };
}

// Called after a viewer accepts a guest invite — they need to start
// publishing their own camera/mic into the room they're already
// connected to as a subscriber, becoming a real second feed on stage.
export async function becomeGuestPublisher(room: Room): Promise<LocalVideoTrack | null> {
  await room.localParticipant.setCameraEnabled(true);
  await room.localParticipant.setMicrophoneEnabled(true);
  const videoPub = Array.from(room.localParticipant.videoTrackPublications.values())[0];
  return (videoPub?.videoTrack as LocalVideoTrack | undefined) ?? null;
}

export async function stopGuestPublishing(room: Room): Promise<void> {
  await room.localParticipant.setCameraEnabled(false);
  await room.localParticipant.setMicrophoneEnabled(false);
}
