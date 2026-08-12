import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, SPACING } from '../../../theme';
import { fetchApi } from '../../../utils/api';
import { ACCENT } from '../../learning/LearningHomeScreen';
import { formatCurrency } from '../../../utils/format';

export default function CourseLessonsScreen({ route, navigation }: any) {
  const { courseId } = route.params;
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi(`/learning/courses/${courseId}`);
      setCourse(res.ok ? await res.json() : null);
    } catch { setCourse(null); }
    setLoading(false);
  }, [courseId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{course?.title || 'Course'}</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('AddLesson', { courseId })}>
          <Ionicons name="add-circle-outline" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 10, paddingBottom: 40 }}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}><Text style={styles.statValue}>{course?.lessons?.length ?? 0}</Text><Text style={styles.statLabel}>Lessons</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{course?.price > 0 ? formatCurrency(course.price) : 'Free'}</Text><Text style={styles.statLabel}>Price</Text></View>
        </View>

        <Text style={styles.sectionLabel}>LESSONS</Text>
        {(!course?.lessons || course.lessons.length === 0) ? (
          <View style={styles.empty}>
            <Ionicons name="reader-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No lessons yet</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('AddLesson', { courseId })}>
              <Text style={styles.emptyBtnText}>Add a lesson</Text>
            </TouchableOpacity>
          </View>
        ) : (
          course.lessons.map((lesson: any, i: number) => (
            <View key={lesson.id} style={styles.lessonRow}>
              <View style={styles.lessonIndex}><Text style={styles.lessonIndexText}>{i + 1}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                <Text style={styles.lessonMeta}>{lesson.durationMin} min</Text>
              </View>
            </View>
          ))
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
  iconBtn: { padding: 6 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  statValue: { color: ACCENT, fontSize: 16, fontWeight: '800' },
  statLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
  sectionLabel: { ...TYPOGRAPHY.label, fontSize: 11, marginTop: 4 },
  lessonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  lessonIndex: { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
  lessonIndexText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700' },
  lessonTitle: { color: COLORS.text, fontWeight: '600', fontSize: 13 },
  lessonMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  emptyBtn: { backgroundColor: ACCENT, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
