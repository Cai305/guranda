import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { fetchApi } from '../../../utils/api';
import { ACCENT } from '../../learning/LearningHomeScreen';
import { formatCurrency } from '../../../utils/format';

export default function MyCoursesScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/learning/courses/mine');
      const data = await res.json();
      setCourses(Array.isArray(data) ? data : []);
    } catch { setCourses([]); }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const styles = useThemedStyles(({ COLORS, SPACING, TYPOGRAPHY }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    iconBtn: { padding: 6 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
    cardTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    cardMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
    cardPrice: { color: ACCENT, fontWeight: '800', fontSize: 14 },
    empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
    emptyText: { color: COLORS.text, fontSize: 15, fontWeight: '600', textAlign: 'center' },
    emptyBtn: { backgroundColor: ACCENT, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
    emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Teaching</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('AddEditCourse')}>
          <Ionicons name="add-circle-outline" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: SPACING.lg, gap: 10, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.primary} />}
        >
          {courses.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="book-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>You haven't created a course yet</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('AddEditCourse')}>
                <Text style={styles.emptyBtnText}>Create a course</Text>
              </TouchableOpacity>
            </View>
          ) : (
            courses.map(course => (
              <TouchableOpacity key={course.id} style={styles.card} onPress={() => navigation.navigate('CourseLessons', { courseId: course.id })}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{course.title}</Text>
                  <Text style={styles.cardMeta}>{course._count?.lessons ?? 0} lessons · {course._count?.enrollments ?? 0} enrolled</Text>
                </View>
                <Text style={styles.cardPrice}>{course.price > 0 ? formatCurrency(course.price) : 'Free'}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
