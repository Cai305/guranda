import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Alert, Image, Modal, Share, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { fetchApi } from '../utils/api';

export default function AddContactScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const { user } = useAuth();
  const incomingUsername = route?.params?.username;
  const incomingUid = route?.params?.uid;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  // Modals state
  const [showQR, setShowQR] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  
  // Camera permission
  const [permission, requestPermission] = useCameraPermissions();

  // ?uid= is a stable-userId fallback — usernames are reassignable/tradeable
  // now (Username Marketplace), so a link shared under an old username could
  // later resolve to a different owner. New links always carry it; old links
  // generated before this change won't have it and fall back to a username
  // string match below.
  const myInviteLink = `lifeos://add/${user?.username}?uid=${user?.userId}`;

  useEffect(() => {
    if (incomingUsername) {
      handleUsernameFound(incomingUsername, incomingUid);
    }
  }, [incomingUsername, incomingUid]);

  const handleUsernameFound = (targetUsername: string, uid?: string) => {
    // Prevent multiple calls
    if (startingChat) return;

    if (uid) {
      fetchApi(`/users/by-id/${uid}`)
        .then(res => (res.ok ? res.json() : null))
        .then(found => {
          if (found) {
            startChat(found.id, found.profile?.displayName || found.username);
          } else {
            Alert.alert('User not found', `This contact link is no longer valid.`);
            setShowScanner(false);
          }
        })
        .catch(console.error);
      return;
    }

    fetchApi(`/users/search?q=${targetUsername}`)
    .then(res => res.json())
    .then(users => {
      const found = users.find((u: any) => u.username === targetUsername);
      if (found) {
        startChat(found.userId, found.displayName || found.username);
      } else {
        Alert.alert('User not found', `Could not find a user with ID: ${targetUsername}`);
        setShowScanner(false);
      }
    })
    .catch(console.error);
  };

  const searchUsers = async (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setResults([]);
      return;
    }

    try {
      setSearching(true);
      const res = await fetchApi(`/users/search?q=${text}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const startChat = async (targetUserId: string, targetName: string) => {
    try {
      setStartingChat(true);
      setShowScanner(false); // Close scanner if open
      
      const res = await fetchApi(`/chats/direct`, {
        method: 'POST',
        body: JSON.stringify({ targetUserId })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to start chat');
      
      navigation.replace('ChatRoom', {
        roomId: data.id,
        roomName: targetName,
        roomType: 'Private',
        targetUserId,
      });
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setStartingChat(false);
    }
  };

  const shareLink = async () => {
    try {
      await Share.share({
        message: `Add me on Guranda! Click this link to chat: ${myInviteLink}`,
        url: myInviteLink,
        title: 'Add me on Guranda'
      });
    } catch (error: any) {
      Alert.alert('Error sharing link', error.message);
    }
  };

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Camera permission is required to scan QR codes.');
        return;
      }
    }
    setShowScanner(true);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    // Prevent multiple scans
    if (startingChat) return;

    // Accept new Guranda links plus legacy MXit2 QR codes
    const prefixes = ['lifeos://add/', 'https://lifeos.app/add/', 'mxit2://add/', 'https://mxit2.app/add/'];
    const match = prefixes.find(p => data.startsWith(p));
    if (match) {
      const rest = data.replace(match, '');
      const [targetUsername, queryString] = rest.split('?');
      const uid = queryString ? new URLSearchParams(queryString).get('uid') ?? undefined : undefined;
      handleUsernameFound(targetUsername, uid);
    } else {
      Alert.alert('Invalid QR Code format.');
      setShowScanner(false);
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
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    backButton: {
      padding: 4,
    },
    actionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 12,
      paddingHorizontal: 15,
      paddingVertical: 20,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    actionBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.surface,
      padding: 15,
      borderRadius: 16,
      width: '48%',
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    actionText: {
      ...TYPOGRAPHY.body2,
      marginTop: 8,
      fontSize: 12,
      fontWeight: 'bold',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.surface,
      margin: 15,
      paddingHorizontal: 15,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    searchIcon: {
      marginRight: 10,
    },
    searchInput: {
      flex: 1,
      color: COLORS.text,
      paddingVertical: 12,
      fontSize: 16,
    },
    spinner: {
      marginLeft: 10,
    },
    list: {
      paddingHorizontal: 15,
    },
    userItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 15,
      backgroundColor: COLORS.surface,
      borderRadius: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: COLORS.background,
      marginRight: 15,
    },
    userInfo: {
      flex: 1,
    },
    displayName: {
      ...TYPOGRAPHY.body1,
      fontWeight: 'bold',
    },
    username: {
      ...TYPOGRAPHY.body2,
      color: COLORS.textMuted,
    },
    emptyText: {
      ...TYPOGRAPHY.body2,
      color: COLORS.textMuted,
      textAlign: 'center',
      marginTop: 20,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      ...TYPOGRAPHY.body2,
      color: COLORS.textMuted,
      marginTop: 10,
    },
    // Modals
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: COLORS.surface,
      padding: 30,
      borderRadius: 24,
      alignItems: 'center',
      width: '100%',
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    modalTitle: {
      ...TYPOGRAPHY.h2,
      marginBottom: 20,
    },
    qrWrapper: {
      padding: 20,
      backgroundColor: COLORS.text, // White background for QR code scanability
      borderRadius: 16,
      marginBottom: 15,
    },
    qrSubtitle: {
      ...TYPOGRAPHY.body1,
      color: COLORS.textMuted,
      marginBottom: 30,
    },
    closeBtn: {
      backgroundColor: COLORS.primary,
      paddingVertical: 15,
      paddingHorizontal: 40,
      borderRadius: 999,
    },
    closeBtnText: {
      color: COLORS.text,
      fontWeight: 'bold',
      fontSize: 16,
    },
    scannerContainer: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    scannerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      zIndex: 10,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    scannerOverlay: {
      ...StyleSheet.absoluteFill,
      justifyContent: 'center',
      alignItems: 'center',
      pointerEvents: 'none',
    },
    scannerTarget: {
      width: 250,
      height: 250,
      borderWidth: 2,
      borderColor: COLORS.secondary,
      backgroundColor: 'transparent',
    },
    scannerHelpText: {
      color: COLORS.text,
      marginTop: 20,
      fontSize: 16,
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: 10,
      borderRadius: 8,
    },
    webScannerFallback: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 30,
    }
  }));

  const renderUser = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.userItem} 
      activeOpacity={0.7}
      onPress={() => startChat(item.userId, item.displayName || item.username)}
    >
      <Image 
        source={{ uri: `https://api.dicebear.com/7.x/avataaars/png?seed=${item.username}` }} 
        style={styles.avatar} 
      />
      <View style={styles.userInfo}>
        <Text style={styles.displayName}>{item.displayName || item.username}</Text>
        <Text style={styles.username}>@{item.username}</Text>
      </View>
      <Ionicons name="chatbubble" size={20} color={COLORS.secondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Add Contact</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setShowQR(true)}>
          <Ionicons name="qr-code" size={24} color={COLORS.primary} />
          <Text style={styles.actionText}>My QR Code</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={handleOpenScanner}>
          <Ionicons name="scan" size={24} color={COLORS.secondary} />
          <Text style={styles.actionText}>Scan QR</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={shareLink}>
          <Ionicons name="share-social" size={24} color="#FFA500" />
          <Text style={styles.actionText}>Share Link</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('CreateGroup')}>
          <Ionicons name="people" size={24} color={COLORS.success || '#22C55E'} />
          <Text style={styles.actionText}>New Group</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search App-ID or Phone Number..."
          placeholderTextColor={COLORS.textMuted}
          value={query}
          onChangeText={searchUsers}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searching && <ActivityIndicator size="small" color={COLORS.secondary} style={styles.spinner} />}
      </View>

      {startingChat ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.secondary} />
          <Text style={styles.loadingText}>Starting chat...</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.userId}
          renderItem={renderUser}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            query.trim() !== '' && !searching ? (
              <Text style={styles.emptyText}>No users found.</Text>
            ) : null
          }
        />
      )}

      {/* MY QR CODE MODAL */}
      <Modal visible={showQR} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Scan to Add Me</Text>
            <View style={styles.qrWrapper}>
              <QRCode
                value={myInviteLink}
                size={200}
                color={COLORS.background}
                backgroundColor={COLORS.text}
              />
            </View>
            <Text style={styles.qrSubtitle}>@{user?.username}</Text>
            
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowQR(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SCAN QR CODE MODAL */}
      <Modal visible={showScanner} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <TouchableOpacity onPress={() => setShowScanner(false)} style={styles.backButton}>
              <Ionicons name="close" size={30} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={TYPOGRAPHY.h2}>Scan QR Code</Text>
            <View style={{ width: 30 }} />
          </View>
          
          {Platform.OS === 'web' ? (
            <View style={styles.webScannerFallback}>
              <Text style={styles.emptyText}>Camera scanning is not fully supported on Web Emulator.</Text>
              <Text style={styles.emptyText}>Please test on a physical Android/iOS device.</Text>
            </View>
          ) : (
            <CameraView 
              style={StyleSheet.absoluteFill}
              facing="back"
              onBarcodeScanned={handleBarcodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
            />
          )}
          
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerTarget} />
            <Text style={styles.scannerHelpText}>Center QR Code inside the box</Text>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

