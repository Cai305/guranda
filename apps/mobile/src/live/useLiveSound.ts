import { useCallback, useRef } from 'react';
import { useAudioPlayer } from 'expo-audio';

export type LiveSoundType = 'laugh' | 'cry' | 'fire' | 'clap' | 'love' | 'shocked' | 'blush' | 'inlove';

// Mixkit free sound-effect previews (CC0-style Mixkit license), each picked
// from Mixkit's own labeled category for the emotion it represents — not
// arbitrary catalog IDs — so the sound actually matches the reaction.
const SOUND_URLS: Record<LiveSoundType, string> = {
  laugh: 'https://assets.mixkit.co/active_storage/sfx/410/410-preview.mp3', // "Woman hilarious laughing"
  cry: 'https://assets.mixkit.co/active_storage/sfx/474/474-preview.mp3', // "Lost kid sobbing"
  fire: 'https://assets.mixkit.co/active_storage/sfx/1345/1345-preview.mp3', // "Short fire whoosh"
  clap: 'https://assets.mixkit.co/active_storage/sfx/3035/3035-preview.mp3', // "Small crowd clapping"
  love: 'https://assets.mixkit.co/active_storage/sfx/2192/2192-preview.mp3', // "Little cute kiss"
  shocked: 'https://assets.mixkit.co/active_storage/sfx/965/965-preview.mp3', // "Female shocked gasp"
  blush: 'https://assets.mixkit.co/active_storage/sfx/743/743-preview.mp3', // "Cartoon giggle"
  inlove: 'https://assets.mixkit.co/active_storage/sfx/493/493-preview.mp3', // "Fast Heartbeat"
};

const SOUND_TYPES = Object.keys(SOUND_URLS) as LiveSoundType[];
const SOUND_DURATION_MS = 3000;
export { SOUND_DURATION_MS as LIVE_SOUND_DURATION_MS };

export function useLiveSound() {
  // useAudioPlayer must be called unconditionally per hook rules, so build
  // one player per known sound type up front.
  const laughPlayer = useAudioPlayer(SOUND_URLS.laugh);
  const cryPlayer = useAudioPlayer(SOUND_URLS.cry);
  const firePlayer = useAudioPlayer(SOUND_URLS.fire);
  const clapPlayer = useAudioPlayer(SOUND_URLS.clap);
  const lovePlayer = useAudioPlayer(SOUND_URLS.love);
  const shockedPlayer = useAudioPlayer(SOUND_URLS.shocked);
  const blushPlayer = useAudioPlayer(SOUND_URLS.blush);
  const inlovePlayer = useAudioPlayer(SOUND_URLS.inlove);

  const players: Record<LiveSoundType, ReturnType<typeof useAudioPlayer>> = {
    laugh: laughPlayer, cry: cryPlayer, fire: firePlayer, clap: clapPlayer,
    love: lovePlayer, shocked: shockedPlayer, blush: blushPlayer, inlove: inlovePlayer,
  };
  const timerRefs = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});

  const playSound = useCallback((type: LiveSoundType) => {
    const player = players[type];
    if (!player) return;
    try {
      player.seekTo(0);
      player.play();
      if (timerRefs.current[type]) clearTimeout(timerRefs.current[type]!);
      timerRefs.current[type] = setTimeout(() => player.pause(), SOUND_DURATION_MS);
    } catch {
      // Audio may not be available on all platforms — fail silently
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [laughPlayer, cryPlayer, firePlayer, clapPlayer, lovePlayer, shockedPlayer, blushPlayer, inlovePlayer]);

  return { playSound };
}

export { SOUND_TYPES as LIVE_SOUND_TYPES };
