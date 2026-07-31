import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, GRADIENTS } from '../../../theme';
import { fetchApi } from '../../../utils/api';
import SessionHeaderActions from '../../../components/SessionHeaderActions';

export default function HairHomeScreen({ navigation }: any) {
  const [search, setSearch] = useState('');
  const [hairdressers, setHairdressers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock user coordinates (Johannesburg for testing since we seeded there)
  const userLat = -26.2041;
  const userLng = 28.0473;

  useEffect(() => {
    fetchHairdressers();
  }, []);

  const fetchHairdressers = async (query = '') => {
    try {
      setLoading(true);
      const res = await fetchApi(`/hair/search?lat=${userLat}&lng=${userLng}&q=${query}`);
      const data = await res.json();
      setHairdressers(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    fetchHairdressers(text);
  };

  const seedDatabase = async () => {
    try {
      await fetchApi('/hair/seed', { method: 'POST' });
      fetchHairdressers();
    } catch (error) {
      console.error(error);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('HairdresserProfile', { id: item.id })}
    >
      <Image
        source={{ uri: item.avatarUrl || 'https://via.placeholder.com/100' }}
        style={styles.avatar}
      />
      <View style={styles.cardContent}>
        <Text style={TYPOGRAPHY.h3}>{item.businessName}</Text>
        <Text style={TYPOGRAPHY.body2} numberOfLines={1}>
          {item.address || 'Location unknown'}
        </Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={16} color="#FFD700" />
          <Text style={[TYPOGRAPHY.body2, { marginLeft: 4 }]}>{item.rating?.toFixed(1) || 'New'}</Text>
          <Text style={[TYPOGRAPHY.body2, { marginLeft: 12, color: COLORS.textMuted }]}>
            {item.services?.length || 0} services
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={24} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <SessionHeaderActions
          navigation={navigation}
          session={{
            id: 'hair',
            label: 'Hair & Beauty',
            icon: 'cut',
            gradient: GRADIENTS.sunset,
            route: { name: 'HairHome' },
          }}
        />
        <Text style={TYPOGRAPHY.h2}>Hair & Beauty</Text>
        <TouchableOpacity onPress={seedDatabase}>
          <Ionicons name="flask-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for styles, braids, barbers..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={handleSearch}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={hairdressers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={TYPOGRAPHY.body1}>No hairdressers found nearby.</Text>
              <Text style={TYPOGRAPHY.body2}>Tap the flask icon top-right to seed data.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    margin: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    ...TYPOGRAPHY.body1,
    color: COLORS.text,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  cardContent: {
    flex: 1,
    marginLeft: 16,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
});
