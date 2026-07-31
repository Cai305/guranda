import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, SPACING } from '../../theme';
import { fetchApi } from '../../utils/api';
import { ACCENT } from './LearningHomeScreen';

export default function CourseDetailScreen({ route, navigation }: any) {
  const { courseId } = route.params;
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetchApi(`/learning/courses/${courseId}`);
      setCourse(res.ok ? await res.json() : null);
    } catch { setCourse(null); }
    setLoading(false);
  }, [courseId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const enroll = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetchApi(`/learning/courses/${courseId}/enroll`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to enroll');
      }
      await load();
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const completeLesson = async (lessonId: string) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetchApi(`/learning/lessons/${lessonId}/complete`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update progress');
      }
      await load();
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!course) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Course</Text>
          <View style={{ width: 30 }} />
        </View>
        <Text style={styles.hint}>Course not found.</Text>
      </SafeAreaView>
    );
  }

  const enrollment = course.enrollment;
  const completedLessonIds = new Set((enrollment?.lessonProgress || []).filter((p: any) => p.completed).map((p: any) => p.lessonId));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{course.title}</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 16, paddingBottom: 60 }}>
        <View style={styles.card}>
          <View style={styles.topRow}>
            <View style={styles.levelPill}><Text style={styles.levelPillText}>{course.level}</Text></View>
            <Text style={styles.price}>{course.price > 0 ? `${course.price} MSH` : 'Free'}</Text>
          </View>
          <Text style={styles.category}>{course.category}</Text>
          {course.description ? <Text style={styles.description}>{course.description}</Text> : null}
          <Text style={styles.creatorText}>By {course.creator?.profile?.displayName || course.creator?.username}</Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!enrollment ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={enroll} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{course.price > 0 ? `Enroll · ${course.price} MSH` : 'Enroll for free'}</Text>}
          </TouchableOpacity>
        ) : (
          <View style={styles.progressCard}>
            <View style={styles.progressTopRow}>
              <Text style={styles.progressLabel}>Your progress</Text>
              <Text style={styles.progressPct}>{enrollment.progressPct}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${enrollment.progressPct}%` }]} />
            </View>
            {enrollment.certificate && (
              <TouchableOpacity style={styles.certBtn} onPress={() => navigation.navigate('MyLearning')}>
                <Ionicons name="ribbon" size={16} color="#22c55e" />
                <Text style={styles.certBtnText}>Certificate earned — view in My Learning</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Text style={styles.sectionLabel}>LESSONS</Text>
        {course.lessons.length === 0 ? (
          <Text style={styles.hint}>No lessons added yet.</Text>
        ) : (
          course.lessons.map((lesson: any, i: number) => {
            const done = completedLessonIds.has(lesson.id);
            return (
              <View key={lesson.id} style={styles.lessonRow}>
                <View style={[styles.lessonIndex, done && styles.lessonIndexDone]}>
                  {done ? <Ionicons name="checkmark" size={14} color="#fff" /> : <Text style={styles.lessonIndexText}>{i + 1}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lessonTitle}>{lesson.title}</Text>
                  <Text style={styles.lessonMeta}>{lesson.durationMin} min</Text>
                </View>
                {enrollment && !done && (
                  <TouchableOpacity style={styles.completeBtn} onPress={() => completeLesson(lesson.id)} disabled={busy}>
                    <Text style={styles.completeBtnText}>Mark done</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
  back: { padding: 4 },
  headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 6 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  levelPill: { backgroundColor: `${ACCENT}22`, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  levelPillText: { color: ACCENT, fontSize: 11, fontWeight: '700' },
  price: { color: ACCENT, fontSize: 18, fontWeight: '800' },
  category: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  description: { color: COLORS.text, fontSize: 14, marginTop: 4 },
  creatorText: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  primaryBtn: { backgroundColor: ACCENT, borderRadius: 14, padding: 15, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  progressCard: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  progressTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { color: COLORS.text, fontWeight: '600', fontSize: 13 },
  progressPct: { color: ACCENT, fontWeight: '800', fontSize: 13 },
  progressBarBg: { height: 8, borderRadius: 4, backgroundColor: COLORS.surfaceElevated, overflow: 'hidden' },
  progressBarFill: { height: 8, borderRadius: 4, backgroundColor: ACCENT },
  certBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#22c55e15', borderRadius: 10, padding: 10 },
  certBtnText: { color: '#22c55e', fontSize: 12, fontWeight: '600', flex: 1 },
  sectionLabel: { ...TYPOGRAPHY.label, fontSize: 11 },
  lessonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  lessonIndex: { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
  lessonIndexDone: { backgroundColor: '#22c55e' },
  lessonIndexText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700' },
  lessonTitle: { color: COLORS.text, fontWeight: '600', fontSize: 13 },
  lessonMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  completeBtn: { backgroundColor: COLORS.surfaceElevated, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  completeBtnText: { color: COLORS.text, fontSize: 11, fontWeight: '600' },
  hint: { color: COLORS.textMuted, fontSize: 13 },
  errorText: { color: '#ef4444', fontSize: 13 },
});
