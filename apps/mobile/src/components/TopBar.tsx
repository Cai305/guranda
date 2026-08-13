import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useAuth, UserStatus } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../utils/api';

export default function TopBar({ navigation }: { navigation?: any }) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const { user, status, updateStatus } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'presence' | 'bio' | 'myStatus'>('presence');
  const [statusMessage, setStatusMessage] = useState('');
  const [savingBio, setSavingBio] = useState(false);

  // "My Status" — the WhatsApp-style photo/video status (a CONTACTS-
  // visibility Story), distinct from the "Status Bio" text tab above. Loaded
  // lazily since TopBar is mounted standalone with no props threaded in
  // (see ChatListScreen.tsx) and has no other access to storyGroups.
  const [myStatusGroup, setMyStatusGroup] = useState<any | null>(null);
  const [myStatusLoading, setMyStatusLoading] = useState(false);
  const [deletingStoryId, setDeletingStoryId] = useState<string | null>(null);

  const fetchMyStatus = () => {
    setMyStatusLoading(true);
    // Bypasses fetchApi's 5-minute GET cache — this tab must reflect a
    // status just posted/deleted immediately, not stale data from whenever
    // /stories/feed last happened to be called elsewhere in the app.
    fetchApi('/stories/feed', { headers: { 'Cache-Control': 'no-cache' } })
      .then(r => r.ok ? r.json() : [])
      .then(groups => {
        const mine = Array.isArray(groups) ? groups.find((g: any) => g.userId === user?.userId) : null;
        const activeStories = mine ? mine.stories.filter((s: any) => s.visibility === 'CONTACTS') : [];
        setMyStatusGroup(activeStories.length > 0 ? { ...mine, stories: activeStories } : null);
      })
      .catch(() => setMyStatusGroup(null))
      .finally(() => setMyStatusLoading(false));
  };

  useEffect(() => {
    if (modalVisible && activeTab === 'myStatus') fetchMyStatus();
  }, [modalVisible, activeTab]);

  const deleteMyStatus = (storyId: string) => {
    setDeletingStoryId(storyId);
    fetchApi(`/stories/${storyId}`, { method: 'DELETE' })
      .then(() => fetchMyStatus())
      .catch(() => Alert.alert('Error', 'Could not remove your status.'))
      .finally(() => setDeletingStoryId(null));
  };

  const openMyStatus = (storyIndex: number) => {
    if (!navigation || !myStatusGroup) return;
    setModalVisible(false);
    navigation.navigate('StoryViewer', { groups: [myStatusGroup], initialGroupIndex: 0, initialStoryIndex: storyIndex });
  };

  const goPostStatus = () => {
    if (!navigation) return;
    setModalVisible(false);
    navigation.navigate('CreateStory', { mode: 'status' });
  };

  useEffect(() => {
    fetchApi('/users/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.profile?.statusMessage) setStatusMessage(data.profile.statusMessage);
      })
      .catch(() => {});
  }, []);

  const getStatusColor = (s: UserStatus) => {
    switch (s) {
      case 'online': return '#00FF00';
      case 'away': return '#FFA500';
      case 'busy': return '#FF0000';
      default: return '#00FF00';
    }
  };

  const handleStatusSelect = (newStatus: UserStatus) => {
    updateStatus(newStatus);
    if (activeTab === 'presence') setModalVisible(false);
  };

  const saveBioStatus = async () => {
    setSavingBio(true);
    try {
      const res = await fetchApi('/users/profile', {
        method: 'POST',
        body: JSON.stringify({ statusMessage }),
      });
      if (res.ok) {
        Alert.alert('Saved!', 'Your status message has been updated.');
        setModalVisible(false);
      }
    } catch {
      Alert.alert('Error', 'Could not save status message.');
    } finally {
      setSavingBio(false);
    }
  };

  const displayStatus = statusMessage || 'Living the Guranda ✨';

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY }) => ({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 15,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    avatarContainer: { position: 'relative', marginRight: 15 },
    avatar: {
      width: 45, height: 45, borderRadius: 22.5,
      backgroundColor: COLORS.surface, borderWidth: 2, borderColor: COLORS.secondary,
    },
    statusDot: {
      position: 'absolute', bottom: 0, right: 0,
      width: 12, height: 12, borderRadius: 6,
      borderWidth: 2, borderColor: '#1A1A2E',
    },
    infoContainer: { flex: 1, justifyContent: 'center' },
    name: { ...TYPOGRAPHY.h2, fontSize: 18, marginBottom: 2 },
    statusMessage: { ...TYPOGRAPHY.body2, color: COLORS.textMuted, fontStyle: 'italic' },
    storyBtn: { padding: 4 },
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: COLORS.surface,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 24, paddingBottom: 36,
      borderWidth: 1, borderColor: COLORS.border,
    },
    tabs: { flexDirection: 'row', marginBottom: 20, backgroundColor: COLORS.background, borderRadius: 10, padding: 4 },
    tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
    tabActive: { backgroundColor: COLORS.surface },
    tabText: { ...TYPOGRAPHY.body2, color: COLORS.textMuted, fontWeight: '600' },
    tabTextActive: { color: COLORS.text },
    statusOption: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    modalStatusDot: { width: 12, height: 12, borderRadius: 6, marginRight: 15 },
    statusOptionText: { ...TYPOGRAPHY.body1, flex: 1 },
    bioInput: {
      backgroundColor: COLORS.background, color: COLORS.text,
      borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
      padding: 14, fontSize: 15, marginBottom: 6,
    },
    saveBtn: {
      backgroundColor: COLORS.primary, borderRadius: 12,
      paddingVertical: 14, alignItems: 'center',
    },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    myStatusRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    myStatusThumbWrap: { borderRadius: 10, overflow: 'hidden' },
    myStatusThumb: { width: 44, height: 44, borderRadius: 10 },
    myStatusMeta: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
    myStatusViewersLink: { color: COLORS.secondary, fontSize: 12, marginTop: 2, fontWeight: '600' },
  }));

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        activeOpacity={0.7}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: user?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/png?seed=' + (user?.username || 'lifeos') }}
            style={styles.avatar}
          />
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.name}>{user?.displayName || user?.username || 'Guranda User'}</Text>
          <Text style={styles.statusMessage} numberOfLines={1}>{displayStatus}</Text>
        </View>

        {/* Post story button */}
        {navigation && (
          <TouchableOpacity
            style={styles.storyBtn}
            onPress={() => navigation.navigate('CreateStory')}
          >
            <Ionicons name="add-circle" size={28} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent} onPress={() => {}}>
            {/* Tabs */}
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'presence' && styles.tabActive]}
                onPress={() => setActiveTab('presence')}
              >
                <Text style={[styles.tabText, activeTab === 'presence' && styles.tabTextActive]}>Presence</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'bio' && styles.tabActive]}
                onPress={() => setActiveTab('bio')}
              >
                <Text style={[styles.tabText, activeTab === 'bio' && styles.tabTextActive]}>Status Bio</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'myStatus' && styles.tabActive]}
                onPress={() => setActiveTab('myStatus')}
              >
                <Text style={[styles.tabText, activeTab === 'myStatus' && styles.tabTextActive]}>My Status</Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'presence' ? (
              <>
                <Text style={[TYPOGRAPHY.h2, { marginBottom: 12 }]}>Set Presence</Text>

                <TouchableOpacity style={styles.statusOption} onPress={() => handleStatusSelect('online')}>
                  <View style={[styles.modalStatusDot, { backgroundColor: '#00FF00' }]} />
                  <Text style={styles.statusOptionText}>Online</Text>
                  {status === 'online' && <Ionicons name="checkmark" size={20} color={COLORS.secondary} />}
                </TouchableOpacity>

                <TouchableOpacity style={styles.statusOption} onPress={() => handleStatusSelect('away')}>
                  <View style={[styles.modalStatusDot, { backgroundColor: '#FFA500' }]} />
                  <Text style={styles.statusOptionText}>Away</Text>
                  {status === 'away' && <Ionicons name="checkmark" size={20} color={COLORS.secondary} />}
                </TouchableOpacity>

                <TouchableOpacity style={styles.statusOption} onPress={() => handleStatusSelect('busy')}>
                  <View style={[styles.modalStatusDot, { backgroundColor: '#FF0000' }]} />
                  <Text style={styles.statusOptionText}>Busy</Text>
                  {status === 'busy' && <Ionicons name="checkmark" size={20} color={COLORS.secondary} />}
                </TouchableOpacity>
              </>
            ) : activeTab === 'bio' ? (
              <>
                <Text style={[TYPOGRAPHY.h2, { marginBottom: 6 }]}>Status Bio</Text>
                <Text style={[TYPOGRAPHY.body2, { color: COLORS.textMuted, marginBottom: 14 }]}>
                  This text appears under your name in chats (e.g. "At the gym 💪")
                </Text>
                <TextInput
                  style={styles.bioInput}
                  value={statusMessage}
                  onChangeText={setStatusMessage}
                  placeholder='e.g. "At the gym 💪"'
                  placeholderTextColor={COLORS.textMuted}
                  maxLength={80}
                />
                <Text style={{ color: COLORS.textMuted, fontSize: 11, textAlign: 'right', marginBottom: 14 }}>
                  {statusMessage.length}/80
                </Text>
                <TouchableOpacity style={styles.saveBtn} onPress={saveBioStatus} disabled={savingBio}>
                  {savingBio
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.saveBtnText}>Save</Text>
                  }
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[TYPOGRAPHY.h2, { marginBottom: 6 }]}>My Status</Text>
                <Text style={[TYPOGRAPHY.body2, { color: COLORS.textMuted, marginBottom: 14 }]}>
                  A photo or video only your contacts can see, for 24 hours.
                </Text>
                {myStatusLoading ? (
                  <ActivityIndicator color={COLORS.secondary} style={{ marginVertical: 20 }} />
                ) : !myStatusGroup || myStatusGroup.stories.length === 0 ? (
                  <>
                    <Text style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 14 }}>
                      You haven't posted a status.
                    </Text>
                    <TouchableOpacity style={styles.saveBtn} onPress={goPostStatus}>
                      <Text style={styles.saveBtnText}>Post Status</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {myStatusGroup.stories.map((s: any, i: number) => (
                      <View key={s.id} style={styles.myStatusRow}>
                        <TouchableOpacity style={styles.myStatusThumbWrap} onPress={() => openMyStatus(i)}>
                          {s.mediaUrl ? (
                            <Image source={{ uri: s.mediaUrl }} style={styles.myStatusThumb} />
                          ) : (
                            <View style={[styles.myStatusThumb, { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }]}>
                              <Ionicons name="text" size={16} color="#fff" />
                            </View>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ flex: 1 }}
                          onPress={() => navigation?.navigate('StatusViewers', { storyId: s.id })}
                        >
                          <Text style={styles.myStatusMeta}>Posted {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                          <Text style={styles.myStatusViewersLink}>Viewers</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteMyStatus(s.id)} hitSlop={8} disabled={deletingStoryId === s.id}>
                          {deletingStoryId === s.id
                            ? <ActivityIndicator size="small" color={COLORS.error} />
                            : <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                          }
                        </TouchableOpacity>
                      </View>
                    ))}
                    <TouchableOpacity style={[styles.saveBtn, { marginTop: 4 }]} onPress={goPostStatus}>
                      <Text style={styles.saveBtnText}>Post another</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
