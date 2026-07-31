import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../utils/api';

export default function WalletScreen({ navigation }: any) {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Fallback mock data in case DB isn't seeded with transactions
  const fallbackTransactions = [
    { id: '1', type: 'RECEIVE', amount: '150.00', timestamp: new Date().toISOString() },
    { id: '2', type: 'PAYMENT', amount: '-25.50', timestamp: new Date(Date.now() - 86400000).toISOString() },
    { id: '3', type: 'SEND', amount: '-50.00', timestamp: new Date(Date.now() - 172800000).toISOString() },
  ];

  useEffect(() => {
    if (!user?.userId) return;
    
    fetchApi('/wallets/me')
      .then(res => res.json())
      .then(data => {
        setWallet(data);
      })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const renderTransaction = ({ item }: { item: any }) => {
    const isPositive = item.type === 'RECEIVE' || item.type === 'DEPOSIT';
    const iconName = item.type === 'RECEIVE' || item.type === 'DEPOSIT' ? 'arrow-down-circle' : item.type === 'SEND' ? 'arrow-up-circle' : 'cart';
    const iconColor = isPositive ? COLORS.success : (item.type === 'SEND' ? COLORS.primary : COLORS.warning);

    return (
      <View style={styles.txRow}>
        <View style={styles.txLeft}>
          <Ionicons name={iconName} size={32} color={iconColor} />
          <View style={styles.txDetails}>
            <Text style={TYPOGRAPHY.body1}>{item.type}</Text>
            <Text style={TYPOGRAPHY.body2}>{new Date(item.timestamp).toLocaleDateString()}</Text>
          </View>
        </View>
        <Text style={[TYPOGRAPHY.h3, { color: isPositive ? COLORS.success : COLORS.text }]}>
          {isPositive ? '+' : ''}{item.amount} MSH
        </Text>
      </View>
    );
  };

  if (loading) {
    return <View style={styles.container}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  const transactions = wallet?.transactions?.length ? wallet.transactions : fallbackTransactions;
  const balance = wallet?.balanceMasheleni || '0.00';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={TYPOGRAPHY.body2}>Total Balance</Text>
        <Text style={[TYPOGRAPHY.h1, { color: COLORS.secondary, marginVertical: 10 }]}>{balance} MSH</Text>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Deposit')}>
            <Ionicons name="arrow-down-circle" size={24} color={COLORS.text} />
            <Text style={styles.buttonText}>Deposit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Send')}>
            <Ionicons name="send" size={24} color={COLORS.text} />
            <Text style={styles.buttonText}>Send</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="download" size={24} color={COLORS.text} />
            <Text style={styles.buttonText}>Request</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="qr-code" size={24} color={COLORS.text} />
            <Text style={styles.buttonText}>Scan</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.feedContainer}>
        <Text style={[TYPOGRAPHY.h3, { marginBottom: 15 }]}>Recent Activity</Text>
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          showsVerticalScrollIndicator={false}
        />
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
    padding: 30,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 20,
  },
  actionButton: {
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: COLORS.text,
    fontWeight: '500',
    fontSize: 14,
  },
  feedContainer: {
    flex: 1,
    padding: 20,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  txDetails: {
    justifyContent: 'center',
  }
});
