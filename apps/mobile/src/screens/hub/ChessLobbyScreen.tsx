import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY, GRADIENTS } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import io, { Socket } from 'socket.io-client';
import { API_BASE_URL } from '../../utils/api';
import SessionHeaderActions from '../../components/SessionHeaderActions';

const TIME_CONTROLS = [
  { label: '10 Min', value: 600, icon: 'time-outline' },
  { label: 'No Timer', value: 0, icon: 'infinite-outline' },
  { label: 'Custom', value: -1, icon: 'options-outline' },
];

export default function ChessLobbyScreen({ navigation }: any) {
  const { user } = useAuth();
  const [selectedTime, setSelectedTime] = useState<number>(600);
  const [isSearching, setIsSearching] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(`${API_BASE_URL}/chess`);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to Chess Gateway');
    });

    newSocket.on('match_found', (data) => {
      console.log('Match Found!', data);
      if (data.whiteId === user?.userId || data.blackId === user?.userId) {
        setIsSearching(false);
        navigation.navigate('ChessGame', { gameId: data.gameId });
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user, navigation]);

  const findMatch = () => {
    if (!socket || !user) return;
    setIsSearching(true);
    socket.emit('find_match', { userId: user.userId, timeControl: selectedTime });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <SessionHeaderActions
          navigation={navigation}
          session={{
            id: 'chess',
            label: 'Chess',
            icon: 'grid',
            gradient: GRADIENTS.emerald,
            route: { name: 'Main', params: { screen: 'Life', params: { screen: 'ChessLobby' } } },
          }}
        />
        <Text style={TYPOGRAPHY.h3}>Chess Lobby</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Ionicons name="extension-puzzle" size={80} color={COLORS.primary} style={{ marginBottom: 20 }} />
        <Text style={[TYPOGRAPHY.h1, { marginBottom: 10 }]}>Play Chess</Text>
        <Text style={[TYPOGRAPHY.body1, { color: COLORS.textMuted, textAlign: 'center', marginBottom: 40 }]}>
          Select a time control to find an opponent and start playing.
        </Text>

        <View style={styles.optionsContainer}>
          {TIME_CONTROLS.map((tc) => (
            <TouchableOpacity
              key={tc.label}
              style={[
                styles.timeOption,
                selectedTime === tc.value && styles.timeOptionSelected,
              ]}
              onPress={() => setSelectedTime(tc.value)}
              disabled={isSearching || tc.value === -1} // Custom not fully implemented yet
              activeOpacity={0.7}
            >
              <Ionicons 
                name={tc.icon as any} 
                size={24} 
                color={selectedTime === tc.value ? COLORS.text : COLORS.textMuted} 
              />
              <Text style={[
                styles.timeOptionText,
                selectedTime === tc.value && styles.timeOptionTextSelected
              ]}>
                {tc.label}
              </Text>
              {tc.value === -1 && <Text style={{fontSize: 10, color: COLORS.error, marginTop: 5}}>Coming Soon</Text>}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.findMatchBtn, isSearching && styles.findMatchBtnDisabled]} 
          onPress={findMatch}
          disabled={isSearching || selectedTime === -1}
          activeOpacity={0.8}
        >
          {isSearching ? (
            <>
              <ActivityIndicator color={COLORS.text} />
              <Text style={styles.findMatchText}>Searching for opponent...</Text>
            </>
          ) : (
            <>
              <Ionicons name="search" size={20} color={COLORS.text} />
              <Text style={styles.findMatchText}>Find Match</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
    padding: 20,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 40,
  },
  timeOption: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timeOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  timeOptionText: {
    color: COLORS.textMuted,
    marginTop: 8,
    fontWeight: '600',
  },
  timeOptionTextSelected: {
    color: COLORS.text,
  },
  findMatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  findMatchBtnDisabled: {
    opacity: 0.7,
  },
  findMatchText: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 18,
  },
});
