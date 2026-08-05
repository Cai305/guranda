import React from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';

const CATEGORY_APPS: Record<string, { id: string; name: string; icon: string; color: string; description: string; route?: string }[]> = {
  Games: [
    { id: 'g0', name: 'Chess', icon: 'trophy', color: '#4A90D9', description: 'Play chess with friends online', route: 'ChessLobby' },
    { id: 'g1', name: 'MoonBase Trivia', icon: 'game-controller', color: '#FF006E', description: 'Answer questions, earn points!', route: 'Arcade' },
    { id: 'g2', name: 'Word Chain', icon: 'text', color: '#8338EC', description: 'Link words in a chain battle' },
    { id: 'g3', name: 'Card Clash', icon: 'copy', color: '#FB5607', description: 'Turn-based card strategy' },
  ],
  Finance: [
    { id: 'f1', name: 'Masheleni Savings', icon: 'cash', color: '#2D6A4F', description: 'Set savings goals with Masheleni' },
    { id: 'f2', name: 'Airtime Exchange', icon: 'swap-horizontal', color: '#3A86FF', description: 'Buy and sell airtime' },
    { id: 'f3', name: 'Bill Payments', icon: 'receipt', color: '#F4A261', description: 'Pay electricity, water & TV' },
  ],
  Shopping: [
    { id: 's1', name: 'MXit Marketplace', icon: 'storefront', color: '#FB5607', description: 'Buy & sell locally' },
    { id: 's2', name: 'Fashion Hub', icon: 'shirt', color: '#FF006E', description: 'Trending African fashion' },
    { id: 's3', name: 'Thrift Store', icon: 'pricetag', color: '#8338EC', description: 'Second-hand deals' },
    { id: 's4', name: 'Hair & Beauty', icon: 'cut', color: '#FF006E', description: 'Find hairdressers & buy hair products', route: 'HairHome' },
  ],
  Education: [
    { id: 'e1', name: 'Study Buddy', icon: 'book', color: '#3A86FF', description: 'AI-powered study assistant' },
    { id: 'e2', name: 'Matric Prep', icon: 'school', color: '#00F5D4', description: 'Past papers & solutions' },
    { id: 'e3', name: 'Code Academy', icon: 'code-slash', color: '#FFD700', description: 'Learn to code for free' },
  ],
  Health: [
    { id: 'h1', name: 'MXit Health', icon: 'fitness', color: '#E63946', description: 'Track your health goals' },
    { id: 'h2', name: 'TeleDoc', icon: 'medkit', color: '#2D6A4F', description: 'Consult a doctor online' },
    { id: 'h3', name: 'Mental Wellness', icon: 'happy', color: '#8338EC', description: 'Mindfulness & support' },
  ],
  Utilities: [
    { id: 'u1', name: 'Load Shedding', icon: 'flash', color: '#F4A261', description: 'Check your area schedule' },
    { id: 'u2', name: 'Weather SA', icon: 'cloud', color: '#3A86FF', description: 'Local weather forecasts' },
    { id: 'u3', name: 'Gov Services', icon: 'document-text', color: '#2D6A4F', description: 'ID, passport & more' },
  ],
};

export default function CategoryScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const { categoryName } = route.params;
  const apps = CATEGORY_APPS[categoryName] || [];

  const styles = useThemedStyles(({ COLORS }) => ({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    listContent: {
      padding: 20,
      gap: 12,
    },
    appCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.surface,
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    appIcon: {
      width: 50,
      height: 50,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    appInfo: {
      flex: 1,
      marginLeft: 14,
    },
  }));

  const handleAppPress = (app: any) => {
    if (app.route) {
      navigation.navigate(app.route);
      return;
    }
    Alert.alert(
      app.name,
      `${app.description}\n\nThis mini-app will be available in a future update. Stay tuned!`,
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h3}>{categoryName}</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={apps}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.appCard}
            activeOpacity={0.7}
            onPress={() => handleAppPress(item)}
          >
            <View style={[styles.appIcon, { backgroundColor: item.color }]}>
              <Ionicons name={item.icon as any} size={28} color="#FFF" />
            </View>
            <View style={styles.appInfo}>
              <Text style={TYPOGRAPHY.body1}>{item.name}</Text>
              <Text style={[TYPOGRAPHY.body2, { marginTop: 2 }]}>{item.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={[TYPOGRAPHY.body2, { textAlign: 'center', marginTop: 40 }]}>
            No apps in this category yet.
          </Text>
        }
      />
    </SafeAreaView>
  );
}
