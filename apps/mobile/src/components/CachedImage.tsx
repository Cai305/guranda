import React from 'react';
import { Image as ExpoImage, ImageProps } from 'expo-image';
import { useCachedMedia } from '../hooks/useCachedMedia';

interface Props extends Omit<ImageProps, 'source'> {
  source: { uri: string } | null | undefined;
}

/**
 * Drop-in replacement for expo-image's <Image> — same props, so swapping
 * `ExpoImage` for `CachedImage` on an existing usage is a rename, nothing
 * else. Routes the URL through the encrypted 24h on-device cache
 * (utils/mediaCache.ts) instead of expo-image's own unencrypted disk cache;
 * everything else (contentFit, transition, style, ...) passes straight
 * through untouched.
 */
export default function CachedImage({ source, ...rest }: Props) {
  const cachedUri = useCachedMedia(source?.uri);
  return <ExpoImage source={cachedUri ? { uri: cachedUri } : source} {...rest} />;
}
