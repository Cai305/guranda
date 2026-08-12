import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import SessionHeaderActions from '../../components/SessionHeaderActions';
import { formatCurrency } from '../../utils/format';

export const COURSE_CATEGORIES = ['Culinary', 'Technology', 'Business', 'Design', 'Music', 'Language', 'Fitness', 'Crafts', 'Academics', 'Other'];
export const ACCENT = '#6366F1';

type Tab = 'courses' | 'tutors' | 'communities';

export default function LearningHomeScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, GRADIENTS, SPACING } = theme;
  const [tab, setTab] = useState<Tab>('courses');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (currentTab: Tab, query: string) => {
    setLoading(true);
    try {
      const endpoint = currentTab === 'courses' ? '/learning/courses' : currentTab === 'tutors' ? '/learning/tutors' : '/learning/communities';
      const params = new URLSearchParams();
      if (query && currentTab === 'courses') params.set('search', query);
      if (query && currentTab === 'tutors') params.set('subject', query);
      const qs = params.toString();
      const res = await fetchApi(`${endpoint}${qs ? `?${qs}` : ''}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch { setItems([]); }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => {
    const t = setTimeout(() => load(tab, search), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [tab, search, load]));

  const switchTab = (next: Tab) => {
    setItems([]);
    setLoading(true);
    setTab(next);
  };

  const openDetail = (item: any) => {
    if (tab === 'courses') navigation.navigate('CourseDetail', { courseId: item.id });
    else if (tab === 'tutors') navigation.navigate('TutorDetail', { tutorId: item.id });
    else navigation.navigate('CommunityDetail', { communityId: item.id });
  };

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12, gap: 4 },
    back: { padding: 4, marginRight: 4 },
    headerCenter: { flex: 1 },
    headerTitle: { ...TYPOGRAPHY.h2 },
    headerSub: { color: COLORS.textMuted, fontSize: 12 },
    iconBtn: { padding: 6 },
    hero: { marginHorizontal: SPACING.lg, borderRadius: 16, padding: 20, marginBottom: 16, overflow: 'hidden' },
    heroIcon: { position: 'absolute', right: 16, top: 12 },
    heroTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 4 },
    heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
    tabRow: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: 8, marginBottom: 12 },
    tabChip: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
      paddingVertical: 9, borderRadius: 20,
      backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    },
    tabChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
    tabLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700' },
    tabLabelActive: { color: '#fff' },
    searchRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      marginHorizontal: SPACING.lg, marginBottom: 12,
      backgroundColor: COLORS.surface, borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 10,
      borderWidth: 1, borderColor: COLORS.border,
    },
    searchInput: { flex: 1, color: COLORS.text, fontSize: 14 },
    hostLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', marginRight: SPACING.lg, marginBottom: 10 },
    hostLinkText: { color: ACCENT, fontSize: 12, fontWeight: '600' },
    card: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: COLORS.border,
    },
    avatar: { width: 44, height: 44, borderRadius: 12 },
    avatarPlaceholder: { width: 44, height: 44, borderRadius: 12, backgroundColor: `${ACCENT}15`, justifyContent: 'center', alignItems: 'center' },
    cardTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14, marginBottom: 2 },
    cardSub: { color: COLORS.textMuted, fontSize: 12 },
    cardMetaText: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
    cardPrice: { color: ACCENT, fontWeight: '800', fontSize: 14 },
    empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <SessionHeaderActions
          navigation={navigation}
          session={{
            id: 'learning',
            label: 'Learning',
            icon: 'school',
            gradient: GRADIENTS.emerald,
            route: { name: 'Main', params: { screen: 'Life', params: { screen: 'LearningHome' } } },
          }}
        />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Learning</Text>
          <Text style={styles.headerSub}>Level up in real life</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('MyLearning')}>
          <Ionicons name="ribbon-outline" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('MyCourses')}>
          <Ionicons name="add-circle-outline" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <LinearGradient colors={GRADIENTS.ocean} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.hero}>
        <Ionicons name="school" size={40} color="rgba(255,255,255,0.3)" style={styles.heroIcon} />
        <Text style={styles.heroTitle}>Level up in real life</Text>
        <Text style={styles.heroSub}>Courses, tutors and study communities — learn, get certified, get hired</Text>
      </LinearGradient>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabChip, tab === 'courses' && styles.tabChipActive]} onPress={() => switchTab('courses')}>
          <Ionicons name="book" size={14} color={tab === 'courses' ? '#fff' : COLORS.textMuted} />
          <Text style={[styles.tabLabel, tab === 'courses' && styles.tabLabelActive]}>Courses</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabChip, tab === 'tutors' && styles.tabChipActive]} onPress={() => switchTab('tutors')}>
          <Ionicons name="person" size={14} color={tab === 'tutors' ? '#fff' : COLORS.textMuted} />
          <Text style={[styles.tabLabel, tab === 'tutors' && styles.tabLabelActive]}>Tutors</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabChip, tab === 'communities' && styles.tabChipActive]} onPress={() => switchTab('communities')}>
          <Ionicons name="people" size={14} color={tab === 'communities' ? '#fff' : COLORS.textMuted} />
          <Text style={[styles.tabLabel, tab === 'communities' && styles.tabLabelActive]}>Communities</Text>
        </TouchableOpacity>
      </View>

      {tab !== 'communities' && (
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={tab === 'courses' ? 'Search courses…' : 'Search by subject…'}
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      )}

      {tab === 'tutors' && (
        <TouchableOpacity style={styles.hostLink} onPress={() => navigation.navigate('MyTutorProfile')}>
          <Ionicons name="person-add-outline" size={14} color={ACCENT} />
          <Text style={styles.hostLinkText}>Become a tutor</Text>
        </TouchableOpacity>
      )}
      {tab === 'communities' && (
        <TouchableOpacity style={styles.hostLink} onPress={() => navigation.navigate('AddCommunity')}>
          <Ionicons name="add-circle-outline" size={14} color={ACCENT} />
          <Text style={styles.hostLinkText}>Start a community</Text>
        </TouchableOpacity>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="school-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Nothing here yet</Text>
          </View>
        ) : tab === 'courses' ? (
          <View style={{ paddingHorizontal: SPACING.lg, gap: 10 }}>
            {items.map(course => (
              <TouchableOpacity key={course.id} style={styles.card} activeOpacity={0.85} onPress={() => openDetail(course)}>
                {course.thumbnailUrl ? <Image source={{ uri: course.thumbnailUrl }} style={styles.avatar} /> : (
                  <View style={styles.avatarPlaceholder}><Ionicons name="book" size={20} color={ACCENT} /></View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{course.title}</Text>
                  <Text style={styles.cardSub} numberOfLines={1}>{course.category} · {course.level}</Text>
                  <Text style={styles.cardMetaText}>{course._count?.lessons ?? 0} lessons · {course._count?.enrollments ?? 0} enrolled</Text>
                </View>
                <Text style={styles.cardPrice}>{course.price > 0 ? formatCurrency(course.price) : 'Free'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : tab === 'tutors' ? (
          <View style={{ paddingHorizontal: SPACING.lg, gap: 10 }}>
            {items.map(tutor => (
              <TouchableOpacity key={tutor.id} style={styles.card} activeOpacity={0.85} onPress={() => openDetail(tutor)}>
                {tutor.avatarUrl ? <Image source={{ uri: tutor.avatarUrl }} style={styles.avatar} /> : (
                  <View style={styles.avatarPlaceholder}><Ionicons name="person" size={20} color={ACCENT} /></View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{tutor.name}</Text>
                  <Text style={styles.cardSub} numberOfLines={1}>{tutor.subjects}</Text>
                </View>
                <Text style={styles.cardPrice}>{formatCurrency(tutor.hourlyRate)}/hr</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={{ paddingHorizontal: SPACING.lg, gap: 10 }}>
            {items.map(community => (
              <TouchableOpacity key={community.id} style={styles.card} activeOpacity={0.85} onPress={() => openDetail(community)}>
                <View style={styles.avatarPlaceholder}><Ionicons name="people" size={20} color={ACCENT} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{community.name}</Text>
                  <Text style={styles.cardSub} numberOfLines={1}>{community.topic}</Text>
                  <Text style={styles.cardMetaText}>{community._count?.members ?? 0} members · {community._count?.posts ?? 0} posts</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
