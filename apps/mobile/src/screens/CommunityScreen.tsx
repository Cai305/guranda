import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import { invalidateCachedResponse } from '../utils/apiCache';
import { CommunityDetailsDto } from '@mxit2/types';

export default function CommunityScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const { communityId, communityName } = route.params;
  const [community, setCommunity] = useState<CommunityDetailsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);

  // Refetches on every focus (not just mount) so rejoining this screen after
  // an action taken elsewhere — most importantly, this screen's own join —
  // reflects real membership instead of the state from first mount.
  useFocusEffect(useCallback(() => { fetchCommunity(); }, [communityId]));

  const fetchCommunity = async () => {
    try {
      setLoading(true);
      const res = await fetchApi(`/communities/${communityId}`, { headers: { 'Cache-Control': 'no-cache' } });
      if (res.ok) {
        const data = await res.json();
        setCommunity(data);
        setJoined(!!data.isMember);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await fetchApi(`/communities/${communityId}/join`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json())?.message || "Couldn't join this community");
      // The community-details GET is cache-first (see utils/apiCache.ts) — without
      // clearing it, a revisit within the 5-minute TTL would still read the
      // pre-join "not a member" snapshot despite the join having succeeded.
      await invalidateCachedResponse(`/communities/${communityId}`);
      await invalidateCachedResponse('/communities');
      setJoined(true);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setJoining(false);
    }
  };

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY }) => ({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    backBtn: {
      padding: 5,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    infoSection: {
      padding: 20,
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#3A86FF',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 15,
    },
    title: {
      ...TYPOGRAPHY.h2,
      marginBottom: 8,
      textAlign: 'center',
    },
    description: {
      ...TYPOGRAPHY.body1,
      color: COLORS.textMuted,
      textAlign: 'center',
      marginBottom: 12,
    },
    members: {
      ...TYPOGRAPHY.body2,
      color: COLORS.secondary,
      fontWeight: 'bold',
      marginBottom: 20,
    },
    joinBtn: {
      backgroundColor: COLORS.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 24,
    },
    joinBtnText: {
      ...TYPOGRAPHY.body1,
      color: COLORS.surface,
      fontWeight: 'bold',
    },
    joinedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,255,0,0.1)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      gap: 4,
    },
    joinedText: {
      color: COLORS.primary,
      fontWeight: 'bold',
    },
    roomsSection: {
      flex: 1,
      paddingTop: 20,
    },
    roomsHeader: {
      ...TYPOGRAPHY.body2,
      color: COLORS.textMuted,
      fontWeight: 'bold',
      paddingHorizontal: 20,
      marginBottom: 10,
    },
    listContent: {
      paddingHorizontal: 15,
    },
    roomItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.surface,
      padding: 15,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    roomName: {
      ...TYPOGRAPHY.body1,
      flex: 1,
      marginLeft: 12,
      fontWeight: '500',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorText: {
      ...TYPOGRAPHY.body1,
      color: COLORS.textMuted,
    }
  }));

  const renderRoom = ({ item }: { item: { id: string, name: string, type: string } }) => (
    <TouchableOpacity 
      style={styles.roomItem}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('ChatRoom', { roomId: item.id, roomName: item.name, roomType: item.type })}
    >
      <Ionicons name="chatbubbles-outline" size={24} color={COLORS.textMuted} />
      <Text style={styles.roomName}>{item.name}</Text>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h3}>{communityName}</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : community ? (
        <>
          <View style={styles.infoSection}>
            <View style={styles.iconContainer}>
              <Ionicons name="earth" size={40} color={COLORS.surface} />
            </View>
            <Text style={styles.title}>{community.name}</Text>
            {community.description && (
              <Text style={styles.description}>{community.description}</Text>
            )}
            <Text style={styles.members}>{community._count?.members || 0} Members</Text>
            
            {!joined ? (
              <TouchableOpacity style={styles.joinBtn} onPress={handleJoin} disabled={joining}>
                {joining ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.joinBtnText}>Join Community</Text>}
              </TouchableOpacity>
            ) : (
              <View style={styles.joinedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                <Text style={styles.joinedText}>Joined</Text>
              </View>
            )}
          </View>

          <View style={styles.roomsSection}>
            <Text style={styles.roomsHeader}>CHANNELS</Text>
            <FlatList
              data={community.rooms}
              keyExtractor={(item) => item.id}
              renderItem={renderRoom}
              contentContainerStyle={styles.listContent}
              scrollEnabled={false}
            />
          </View>
        </>
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load community</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
