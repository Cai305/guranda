import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY } from '../../../theme';
import { fetchApi } from '../../../utils/api';

export default function HairdresserProfileScreen({ route, navigation }: any) {
  const { id } = route.params;
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetchApi(`/hair/dressers/${id}`);
      const data = await res.json();
      setProfile(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderService = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.serviceCard}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('HairService', { service: item, profile })}
    >
      <Image
        source={{ uri: item.images?.[0] || 'https://via.placeholder.com/300' }}
        style={styles.serviceImage}
      />
      <View style={styles.serviceInfo}>
        <Text style={TYPOGRAPHY.h4} numberOfLines={1}>{item.title}</Text>
        <Text style={[TYPOGRAPHY.body2, { color: COLORS.textMuted, marginTop: 4 }]} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.serviceFooter}>
          <Text style={[TYPOGRAPHY.h3, { color: COLORS.primary }]}>R{item.price}</Text>
          <Text style={[TYPOGRAPHY.body2, { color: COLORS.textMuted }]}>{item.duration} mins</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderProduct = ({ item }: { item: any }) => (
    <View style={styles.productCard}>
      <Image
        source={{ uri: item.imageUrl || 'https://via.placeholder.com/150' }}
        style={styles.productImage}
      />
      <Text style={[TYPOGRAPHY.body1, { marginTop: 8 }]} numberOfLines={1}>{item.name}</Text>
      <Text style={[TYPOGRAPHY.h4, { color: COLORS.primary, marginTop: 4 }]}>R{item.price}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={TYPOGRAPHY.h3}>Profile not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Image
            source={{ uri: profile.avatarUrl || 'https://via.placeholder.com/400' }}
            style={styles.coverImage}
          />
        </View>

        <View style={styles.content}>
          <Text style={TYPOGRAPHY.h2}>{profile.businessName}</Text>
          <Text style={[TYPOGRAPHY.body1, { color: COLORS.textMuted, marginVertical: 8 }]}>
            {profile.address}
          </Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={18} color="#FFD700" />
            <Text style={[TYPOGRAPHY.body1, { marginLeft: 6 }]}>{profile.rating?.toFixed(1) || 'New'}</Text>
          </View>
          <Text style={[TYPOGRAPHY.body2, { marginTop: 16, lineHeight: 22 }]}>
            {profile.bio}
          </Text>

          <View style={styles.section}>
            <Text style={TYPOGRAPHY.h3}>Services</Text>
            {profile.services?.length > 0 ? (
              profile.services.map((service: any) => (
                <View key={service.id} style={{ marginTop: 12 }}>
                  {renderService({ item: service })}
                </View>
              ))
            ) : (
              <Text style={[TYPOGRAPHY.body2, { marginTop: 8 }]}>No services listed.</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={TYPOGRAPHY.h3}>Products & Hair Pieces</Text>
            {profile.products?.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                {profile.products.map((product: any) => (
                  <View key={product.id} style={{ marginRight: 16 }}>
                    {renderProduct({ item: product })}
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={[TYPOGRAPHY.body2, { marginTop: 8 }]}>No products listed.</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    height: 250,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 20,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    padding: 20,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  section: {
    marginTop: 30,
  },
  serviceCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  serviceImage: {
    width: 100,
    height: 100,
  },
  serviceInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  productCard: {
    width: 140,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  productImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
  },
});
