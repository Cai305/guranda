import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY, GRADIENTS } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import SessionHeaderActions from '../../components/SessionHeaderActions';

const QUESTIONS = [
  {
    question: 'Which country is known as the "Rainbow Nation"?',
    options: ['Nigeria', 'South Africa', 'Kenya', 'Ghana'],
    answer: 1,
  },
  {
    question: 'What is the longest river in Africa?',
    options: ['Congo', 'Niger', 'Nile', 'Zambezi'],
    answer: 2,
  },
  {
    question: 'What is the Guranda mission?',
    options: ['One App. One World.', 'One Identity. One Economy. One Life.', 'Live. Work. Play.', 'Connect Everything'],
    answer: 1,
  },
  {
    question: 'Which African city is known as the "City of Gold"?',
    options: ['Lagos', 'Cairo', 'Johannesburg', 'Nairobi'],
    answer: 2,
  },
  {
    question: 'On the XRPL, what is the native token?',
    options: ['ETH', 'BTC', 'XRP', 'SOL'],
    answer: 2,
  },
];

export default function ArcadeScreen({ navigation }: any) {
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    startTimer();
  }, [currentQ]);

  const startTimer = () => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 10000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !showResult) {
        handleTimeout();
      }
    });
  };

  const handleTimeout = () => {
    setShowResult(true);
    setTimeout(() => nextQuestion(), 1500);
  };

  const handleAnswer = (index: number) => {
    if (showResult) return;
    setSelected(index);
    setShowResult(true);
    progress.stopAnimation();

    if (index === QUESTIONS[currentQ].answer) {
      setScore(prev => prev + 100);
    }

    setTimeout(() => nextQuestion(), 1500);
  };

  const nextQuestion = () => {
    if (currentQ + 1 >= QUESTIONS.length) {
      setGameOver(true);
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentQ(prev => prev + 1);
        setSelected(null);
        setShowResult(false);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  const restart = () => {
    setCurrentQ(0);
    setScore(0);
    setSelected(null);
    setGameOver(false);
    setShowResult(false);
  };

  const q = QUESTIONS[currentQ];
  const timerWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['100%', '0%'],
  });

  if (gameOver) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.gameOverContainer}>
          <Ionicons name="trophy" size={80} color="#FFD700" />
          <Text style={[TYPOGRAPHY.h1, { marginTop: 20 }]}>Game Over!</Text>
          <Text style={[TYPOGRAPHY.h2, { color: COLORS.secondary, marginTop: 10 }]}>
            Score: {score} / {QUESTIONS.length * 100}
          </Text>
          <Text style={[TYPOGRAPHY.body2, { marginTop: 10 }]}>
            You got {score / 100} out of {QUESTIONS.length} correct
          </Text>
          <TouchableOpacity style={styles.playAgainBtn} onPress={restart}>
            <Ionicons name="reload" size={20} color={COLORS.text} />
            <Text style={styles.playAgainText}>Play Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={[TYPOGRAPHY.body1, { color: COLORS.textMuted }]}>Back to Games</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
        <View style={styles.header}>
          <SessionHeaderActions
            navigation={navigation}
            session={{
              id: 'arcade',
              label: 'Arcade',
              icon: 'game-controller',
              gradient: GRADIENTS.sunset,
              route: { name: 'Main', params: { screen: 'Life', params: { screen: 'Arcade' } } },
            }}
          />
          <Text style={TYPOGRAPHY.h3}>Guranda Arcade</Text>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>{score}</Text>
          </View>
        </View>

        <View style={{ padding: 20 }}>
          <Text style={[TYPOGRAPHY.h2, { marginBottom: 15 }]}>Multiplayer</Text>
          <TouchableOpacity
            style={[styles.option, { backgroundColor: COLORS.primary, borderColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 30 }]}
            onPress={() => navigation.navigate('ChessLobby')}
            activeOpacity={0.8}
          >
            <Ionicons name="extension-puzzle-outline" size={24} color={COLORS.text} />
            <Text style={[styles.optionText, { color: COLORS.text, fontWeight: 'bold' }]}>Play Chess</Text>
          </TouchableOpacity>
          
          <Text style={[TYPOGRAPHY.h2, { marginBottom: 15 }]}>Trivia</Text>
        </View>

        {/* Timer bar */}
      <View style={styles.timerContainer}>
        <Animated.View style={[styles.timerBar, { width: timerWidth }]} />
      </View>

      <Animated.View style={[styles.questionContainer, { opacity: fadeAnim }]}>
        <Text style={styles.questionNumber}>Question {currentQ + 1} / {QUESTIONS.length}</Text>
        <Text style={styles.questionText}>{q.question}</Text>

        <View style={styles.optionsContainer}>
          {q.options.map((opt, idx) => {
            let optStyle = styles.option;
            let textColor = COLORS.text;

            if (showResult) {
              if (idx === q.answer) {
                optStyle = { ...styles.option, ...styles.correctOption };
                textColor = '#000';
              } else if (idx === selected && idx !== q.answer) {
                optStyle = { ...styles.option, ...styles.wrongOption };
                textColor = '#FFF';
              }
            }

            return (
              <TouchableOpacity
                key={idx}
                style={optStyle}
                activeOpacity={0.7}
                onPress={() => handleAnswer(idx)}
                disabled={showResult}
              >
                <Text style={[styles.optionText, { color: textColor }]}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  scoreBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  scoreText: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  timerContainer: {
    height: 4,
    backgroundColor: COLORS.border,
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: 'hidden',
  },
  timerBar: {
    height: '100%',
    backgroundColor: COLORS.secondary,
    borderRadius: 2,
  },
  questionContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 30,
  },
  questionNumber: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  questionText: {
    ...TYPOGRAPHY.h2,
    lineHeight: 32,
    marginBottom: 30,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    backgroundColor: COLORS.surface,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  correctOption: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  wrongOption: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  gameOverContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  playAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    marginTop: 30,
    gap: 10,
  },
  playAgainText: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  backBtn: {
    marginTop: 20,
    padding: 10,
  },
});
