import React, { useRef, useEffect } from 'react';

interface Props {
  url: string;
  style?: React.CSSProperties;
  autoPlay?: boolean;
  onProgress?: (seconds: number) => void;
}

export default function VideoPlayer({ url, style, autoPlay, onProgress }: Props) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!onProgress || !ref.current) return;
    const el = ref.current;
    const handler = () => onProgress(Math.floor(el.currentTime));
    el.addEventListener('timeupdate', handler);
    return () => el.removeEventListener('timeupdate', handler);
  }, [onProgress]);

  return (
    <video
      ref={ref}
      src={url}
      controls
      autoPlay={autoPlay}
      playsInline
      style={{ width: '100%', aspectRatio: '16/9', backgroundColor: '#000', maxHeight: 320, ...style }}
    />
  );
}
