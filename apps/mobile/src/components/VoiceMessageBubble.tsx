import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { COLORS } from '../theme';

// A simple static bar pattern rather than a real waveform derived from the
// audio's actual amplitude data — genuine waveform extraction is DSP work
// disproportionate to what this adds visually; the bars just need to read
// as "voice message" and show playback progress via the fill color.
const BAR_HEIGHTS = [6, 10, 16, 9, 14, 20, 11, 17, 8, 13, 19, 10, 15, 7, 12, 16, 9, 14, 6, 11];

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface Props {
  uri: string;
  mine: boolean;
}

export default function VoiceMessageBubble({ uri, mine }: Props) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  const toggle = () => {
    if (status.playing) player.pause();
    else {
      if (status.didJustFinish || status.currentTime >= (status.duration || 0)) player.seekTo(0);
      player.play();
    }
  };

  const progress = status.duration > 0 ? status.currentTime / status.duration : 0;
  const filledBars = Math.round(progress * BAR_HEIGHTS.length);
  const barColor = mine ? 'rgba(255,255,255,0.9)' : COLORS.primary;
  const dimColor = mine ? 'rgba(255,255,255,0.35)' : COLORS.textMuted;

  return (
    <View style={styles.row}>
      <TouchableOpacity onPress={toggle} style={[styles.playBtn, { backgroundColor: mine ? 'rgba(255,255,255,0.2)' : COLORS.primary }]}>
        <Ionicons name={status.playing ? 'pause' : 'play'} size={16} color={mine ? '#FFF' : '#FFF'} />
      </TouchableOpacity>
      <View style={styles.bars}>
        {BAR_HEIGHTS.map((h, i) => (
          <View
            key={i}
            style={[styles.bar, { height: h, backgroundColor: i < filledBars ? barColor : dimColor }]}
          />
        ))}
      </View>
      <Text style={[styles.time, { color: mine ? 'rgba(255,255,255,0.8)' : COLORS.textMuted }]}>
        {formatTime(status.duration > 0 ? (status.playing || status.currentTime > 0 ? status.duration - status.currentTime : status.duration) : 0)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 190, paddingVertical: 2 },
  playBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  bars: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 22 },
  bar: { width: 3, borderRadius: 2 },
  time: { fontSize: 11, minWidth: 32 },
});
