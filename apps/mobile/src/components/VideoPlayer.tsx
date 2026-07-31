import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface Props {
  url: string;
  style?: any;
  autoPlay?: boolean;
  onProgress?: (seconds: number) => void;
}

export default function VideoPlayer({ url, style, autoPlay }: Props) {
  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;background:#000}video{width:100%;height:100vh;object-fit:contain}</style></head><body><video src="${url}" controls ${autoPlay ? 'autoplay' : ''} playsinline></video></body></html>`;
  return (
    <View style={[styles.container, style]}>
      <WebView
        source={{ html }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
});
