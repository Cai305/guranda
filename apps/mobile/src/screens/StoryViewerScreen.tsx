import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Animated, Dimensions, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import { COLORS } from '../theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const STORY_DURATION = 5000; // 5s per story

export default function StoryViewerScreen({ route, navigation }: any) {
  const { groups, initialGroupIndex = 0 } = route.params as {
    groups: { userId: string; user: any; stories: any[] }[];
    initialGroupIndex: number;
  };

  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const currentGroup = groups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];

  // Reactive to currentStory.musicUrl changing — expo-audio's useAudioPlayer
  // reloads its source when the URL passed in changes across renders, same
  // convention as useLiveSound.ts's fixed-URL players elsewhere in the app.
  const musicPlayer = useAudioPlayer(currentStory?.musicUrl || undefined);
  useEffect(() => {
    if (!currentStory?.musicUrl) return;
    try {
      musicPlayer.seekTo(0);
      musicPlayer.play();
    } catch {
      // Audio may not be available on all platforms — fail silently
    }
    return () => {
      try { musicPlayer.pause(); } catch {}
    };
  }, [currentStory?.id, currentStory?.musicUrl]);

  const startProgress = () => {
    progress.setValue(0);
    animRef.current = Animated.timing(progress, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    });
    animRef.current.start(({ finished }) => {
      if (finished) advance();
    });
  };

  const advance = () => {
    animRef.current?.stop();
    const nextStory = storyIndex + 1;
    if (nextStory < currentGroup.stories.length) {
      setStoryIndex(nextStory);
    } else {
      const nextGroup = groupIndex + 1;
      if (nextGroup < groups.length) {
        setGroupIndex(nextGroup);
        setStoryIndex(0);
      } else {
        navigation.goBack();
      }
    }
  };

  const goBack = () => {
    animRef.current?.stop();
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
    } else if (groupIndex > 0) {
      setGroupIndex(groupIndex - 1);
      setStoryIndex(0);
    }
  };

  useEffect(() => {
    startProgress();
    return () => animRef.current?.stop();
  }, [groupIndex, storyIndex]);

  if (!currentStory) return null;

  const bgColors: [string, string] = currentStory.backgroundColor
    ? (JSON.parse(currentStory.backgroundColor) as [string, string])
    : ['#1A1A2E', '#16213E'];

  const displayName = currentGroup.user.profile?.displayName || currentGroup.user.username || 'User';
  const avatarUri = currentGroup.user.profile?.avatarUrl
    || `https://api.dicebear.com/7.x/avataaars/png?seed=${currentGroup.user.username}`;

  const timeLeft = () => {
    const exp = new Date(currentStory.expiresAt).getTime();
    const now = Date.now();
    const hoursLeft = Math.max(0, Math.round((exp - now) / 3600000));
    return hoursLeft === 0 ? 'Expires soon' : `${hoursLeft}h left`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" />

      {/* Background */}
      {currentStory.mediaUrl ? (
        <Image source={{ uri: currentStory.mediaUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <LinearGradient colors={bgColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      )}

      {/* Dim overlay */}
      <View style={styles.dimOverlay} />

      {/* Progress bars */}
      <SafeAreaView style={styles.progressContainer}>
        <View style={styles.progressRow}>
          {currentGroup.stories.map((_, i) => (
            <View key={i} style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: i < storyIndex
                      ? '100%'
                      : i === storyIndex
                        ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                        : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* User info */}
        <View style={styles.userRow}>
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.username}>{displayName}</Text>
            <Text style={styles.timeLeft}>{timeLeft()}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Story text content */}
      {currentStory.textContent ? (
        <View style={styles.textWrap}>
          <Text style={styles.storyText}>{currentStory.textContent}</Text>
        </View>
      ) : null}

      {/* Stickers — percentage-based positions, scaled to this screen */}
      {Array.isArray(currentStory.stickers) && currentStory.stickers.map((sticker: any, i: number) => (
        <Text
          key={i}
          style={[
            styles.sticker,
            {
              left: (sticker.x / 100) * SCREEN_W,
              top: (sticker.y / 100) * SCREEN_H,
              transform: [{ scale: sticker.scale ?? 1 }, { rotate: `${sticker.rotation ?? 0}deg` }],
            },
          ]}
        >
          {sticker.emoji}
        </Text>
      ))}

      {/* Tap zones */}
      <View style={styles.tapZones}>
        <TouchableOpacity style={styles.tapLeft} onPress={goBack} activeOpacity={1} />
        <TouchableOpacity style={styles.tapRight} onPress={advance} activeOpacity={1} />
      </View>

      {/* Group dots */}
      {groups.length > 1 && (
        <View style={styles.groupDots}>
          {groups.map((_, i) => (
            <View key={i} style={[styles.dot, i === groupIndex && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dimOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.2)' },
  progressContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  progressRow: { flexDirection: 'row', gap: 4, paddingHorizontal: 12, paddingTop: 8 },
  progressTrack: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 },
  avatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: COLORS.primary },
  username: { color: '#fff', fontWeight: '700', fontSize: 15 },
  timeLeft: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  textWrap: {
    position: 'absolute',
    bottom: '30%',
    left: 24,
    right: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 16,
    padding: 18,
  },
  storyText: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center', lineHeight: 30 },
  sticker: { position: 'absolute', fontSize: 36, zIndex: 6 },
  tapZones: { ...StyleSheet.absoluteFill, flexDirection: 'row', zIndex: 5 },
  tapLeft: { flex: 1 },
  tapRight: { flex: 1 },
  groupDots: { position: 'absolute', bottom: 40, alignSelf: 'center', flexDirection: 'row', gap: 6, zIndex: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { backgroundColor: '#fff', width: 16 },
});
