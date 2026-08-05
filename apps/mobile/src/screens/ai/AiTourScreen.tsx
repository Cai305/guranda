import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { openAiOrb } from '../../utils/aiOrbBridge';

// Post-activation guided tour: the agent takes the user INTO the app —
// post an OOTD, watch Discovery, play a game — advancing a step each time
// the user comes back from a stop. Ends in the companion chat.

interface TourStop {
  icon: string;
  title: string;
  say: (name: string) => string;
  cta: string;
  route?: { name: string; params?: any };
}

const STOPS: TourStop[] = [
  {
    icon: 'hand-left',
    title: 'Welcome to Guranda',
    say: n =>
      `I'm ${n} — your companion in here. Instead of just telling you about Guranda, let me walk you through it. We'll post your first outfit, watch a video, and play a game. Ready?`,
    cta: "Let's go",
  },
  {
    icon: 'shirt',
    title: 'Post your first Story',
    say: () =>
      'First stop: Stories — post a photo with music and stickers, or label it "of the Day" (OOTD, COTD, anything) to join the trending feed, get votes, and sell what you\'re featuring. Go post one; I\'ll wait right here.',
    cta: 'Take me there',
    route: { name: 'CreateStory' },
  },
  {
    icon: 'play-circle',
    title: 'Discovery videos',
    say: () =>
      'Nice! Next: Discovery — a video feed tuned to your interests. Uploads, playlists, watch-later. Have a look around, then come back.',
    cta: 'Open Discovery',
    route: { name: 'Discovery' },
  },
  {
    icon: 'game-controller',
    title: 'Play one game',
    say: () =>
      'Now the fun part — the arcade. Try Murabaraba, South Africa\'s game of cows. Place your herd, make mills, beat my cousin the game AI. One quick round!',
    cta: 'Play Murabaraba',
    // MurabarabaLobby lives inside HubStackNavigator, nested under the
    // Life tab — not a screen on this (root) stack, so it needs the nested
    // form. A bare navigate('MurabarabaLobby') from here silently no-ops
    // (React Navigation logs "was not handled by any navigator" and stays
    // put), which is what left users stuck on this stop with a dead CTA.
    route: { name: 'Main', params: { screen: 'Life', params: { screen: 'MurabarabaLobby' } } },
  },
  {
    icon: 'sparkles',
    title: "That's the tour!",
    say: () =>
      `There's much more — wallet, rides, food, live streams — and I can work all of it for you. Ask me to wake you up before appointments, request rides, or check your balance. Anything I *do* always needs your approval first. Come talk to me!`,
    cta: 'Start chatting',
  },
];

export default function AiTourScreen({ navigation, route }: any) {
  const agentName = route.params?.config?.name || 'Your AI';
  const [step, setStep] = useState(0);
  const visited = useRef(false);

  // When the user returns from a tour stop, advance to the next step.
  useFocusEffect(
    useCallback(() => {
      if (visited.current) {
        visited.current = false;
        setStep(s => Math.min(s + 1, STOPS.length - 1));
      }
    }, []),
  );

  const stop = STOPS[step];
  const isLast = step === STOPS.length - 1;

  // Both exits land back on Main (tabs visible, nothing blocked) and pop the
  // floating orb's chat dropdown open — rather than the full-screen AiChat
  // route, which covered the tab bar and left the user stuck until they
  // found its back button.
  const finishToFloatingChat = () => {
    navigation.navigate('Main');
    openAiOrb();
  };

  const onCta = () => {
    if (isLast) {
      finishToFloatingChat();
      return;
    }
    if (stop.route) {
      visited.current = true;
      navigation.navigate(stop.route.name, stop.route.params);
    } else {
      setStep(s => s + 1);
    }
  };

  const skipAll = finishToFloatingChat;

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    skipRow: {
      flexDirection: 'row', justifyContent: 'flex-end',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    skipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
    body: { flex: 1, justifyContent: 'center', padding: SPACING.lg },
    card: {
      borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      padding: 24,
      alignItems: 'center',
    },
    orb: {
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: 'rgba(139,92,246,0.4)',
      borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
      justifyContent: 'center', alignItems: 'center',
    },
    stepTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800', marginTop: 14, textAlign: 'center' },
    speech: {
      marginTop: 16,
      backgroundColor: 'rgba(0,0,0,0.35)',
      borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      padding: 14,
      width: '100%',
    },
    speechHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    miniOrb: {
      width: 18, height: 18, borderRadius: 9,
      backgroundColor: COLORS.primary,
      justifyContent: 'center', alignItems: 'center',
    },
    speechName: { color: COLORS.primary, fontWeight: '800', fontSize: 12 },
    speechText: { color: 'rgba(255,255,255,0.88)', fontSize: 14, lineHeight: 21 },
    ctaBtn: {
      flexDirection: 'row', gap: 8,
      marginTop: 20,
      backgroundColor: COLORS.primary,
      borderRadius: RADIUS.pill,
      paddingVertical: 13, paddingHorizontal: 34,
      alignItems: 'center',
    },
    ctaText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
    nextText: { color: COLORS.textMuted, fontSize: 12, marginTop: 12 },
    dots: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 20 },
    dot: {
      width: 8, height: 8, borderRadius: 4,
      backgroundColor: COLORS.surfaceElevated,
    },
    dotActive: { backgroundColor: COLORS.primary, width: 22 },
  }));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.skipRow}>
        <TouchableOpacity onPress={skipAll}>
          <Text style={styles.skipText}>Skip tour</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <LinearGradient colors={['#3A0E6E', '#200840']} style={styles.card}>
          <View style={styles.orb}>
            <Ionicons name={stop.icon as any} size={30} color="#FFF" />
          </View>
          <Text style={styles.stepTitle}>{stop.title}</Text>

          {/* Agent narration bubble */}
          <View style={styles.speech}>
            <View style={styles.speechHeader}>
              <View style={styles.miniOrb}>
                <Ionicons name="sparkles" size={11} color="#FFF" />
              </View>
              <Text style={styles.speechName}>{agentName}</Text>
            </View>
            <Text style={styles.speechText}>{stop.say(agentName)}</Text>
          </View>

          <TouchableOpacity style={styles.ctaBtn} onPress={onCta}>
            <Text style={styles.ctaText}>{stop.cta}</Text>
            <Ionicons name={isLast ? 'chatbubbles' : 'arrow-forward'} size={18} color="#FFF" />
          </TouchableOpacity>

          {step > 0 && !isLast && (
            <TouchableOpacity onPress={() => setStep(s => s + 1)}>
              <Text style={styles.nextText}>Skip this stop</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>

        {/* Progress dots */}
        <View style={styles.dots}>
          {STOPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
