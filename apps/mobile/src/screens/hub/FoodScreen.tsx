import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY, GRADIENTS } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import SessionHeaderActions from '../../components/SessionHeaderActions';

const RESTAURANTS = [
  { id: '1', name: 'Nando\'s Flame Grill', cuisine: 'Peri-Peri Chicken', rating: 4.6, deliveryTime: '25-35 min', icon: '🍗' },
  { id: '2', name: 'Ocean Basket', cuisine: 'Seafood', rating: 4.3, deliveryTime: '30-40 min', icon: '🐟' },
  { id: '3', name: 'Steers', cuisine: 'Burgers & Fries', rating: 4.1, deliveryTime: '20-30 min', icon: '🍔' },
  { id: '4', name: 'Galito\'s', cuisine: 'Flame Grilled', rating: 4.4, deliveryTime: '25-35 min', icon: '🔥' },
  { id: '5', name: 'Spur Steak Ranches', cuisine: 'Steakhouse', rating: 4.5, deliveryTime: '35-45 min', icon: '🥩' },
];

const MENU_ITEMS = [
  { id: 'm1', name: 'Quarter Chicken & Chips', price: 'R89.90', popular: true },
  { id: 'm2', name: 'Peri-Peri Wrap', price: 'R65.00', popular: true },
  { id: 'm3', name: 'Espetada', price: 'R129.90', popular: false },
  { id: 'm4', name: 'Mango & Lime Chicken', price: 'R109.90', popular: false },
  { id: 'm5', name: 'Loaded Fries', price: 'R49.90', popular: true },
];

export default function FoodScreen({ navigation }: any) {
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [cart, setCart] = useState<{ id: string; name: string; price: string; qty: number }[]>([]);
  const [orderPlaced, setOrderPlaced] = useState(false);

  const addToCart = (item: typeof MENU_ITEMS[0]) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === id);
      if (existing && existing.qty > 1) {
        return prev.map(c => c.id === id ? { ...c, qty: c.qty - 1 } : c);
      }
      return prev.filter(c => c.id !== id);
    });
  };

  const totalItems = cart.reduce((sum, c) => sum + c.qty, 0);

  const placeOrder = () => {
    if (cart.length === 0) {
      Alert.alert('Your cart is empty');
      return;
    }
    setOrderPlaced(true);
  };

  if (orderPlaced) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.orderPlacedContainer}>
          <Ionicons name="checkmark-circle" size={80} color={COLORS.secondary} />
          <Text style={[TYPOGRAPHY.h2, { marginTop: 20 }]}>Order Placed!</Text>
          <Text style={[TYPOGRAPHY.body2, { marginTop: 10, textAlign: 'center' }]}>
            Your food is being prepared. Estimated delivery: 25-35 min.
          </Text>
          <Text style={[TYPOGRAPHY.body1, { marginTop: 20, color: COLORS.secondary }]}>
            Paid with Masheleni Wallet 💰
          </Text>
          <TouchableOpacity
            style={styles.backToHubBtn}
            onPress={() => {
              setOrderPlaced(false);
              setCart([]);
              setSelectedRestaurant(null);
              navigation.goBack();
            }}
          >
            <Text style={{ color: COLORS.text, fontWeight: 'bold', fontSize: 16 }}>Back to Hub</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (selectedRestaurant) {
    const restaurant = RESTAURANTS.find(r => r.id === selectedRestaurant);
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setSelectedRestaurant(null); setCart([]); }}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={TYPOGRAPHY.h3}>{restaurant?.name}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[TYPOGRAPHY.body2, { marginBottom: 20 }]}>
            {restaurant?.cuisine} • {restaurant?.deliveryTime} • ⭐ {restaurant?.rating}
          </Text>

          {MENU_ITEMS.map(item => {
            const inCart = cart.find(c => c.id === item.id);
            return (
              <View key={item.id} style={styles.menuItem}>
                <View style={styles.menuItemInfo}>
                  <Text style={TYPOGRAPHY.body1}>{item.name}</Text>
                  <View style={styles.menuItemMeta}>
                    <Text style={styles.menuPrice}>{item.price}</Text>
                    {item.popular && (
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularText}>Popular</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.qtyControls}>
                  {inCart && (
                    <>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => removeFromCart(item.id)}>
                        <Ionicons name="remove" size={18} color={COLORS.text} />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{inCart.qty}</Text>
                    </>
                  )}
                  <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: COLORS.primary }]} onPress={() => addToCart(item)}>
                    <Ionicons name="add" size={18} color={COLORS.text} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {totalItems > 0 && (
          <TouchableOpacity style={styles.cartBar} activeOpacity={0.8} onPress={placeOrder}>
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalItems}</Text>
            </View>
            <Text style={styles.cartText}>Place Order</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.text} />
          </TouchableOpacity>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <SessionHeaderActions
          navigation={navigation}
          session={{
            id: 'food',
            label: 'Food Delivery',
            icon: 'fast-food',
            gradient: GRADIENTS.sunset,
            route: { name: 'Main', params: { screen: 'Life', params: { screen: 'Food' } } },
          }}
        />
        <Text style={TYPOGRAPHY.h3}>Food Delivery</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={RESTAURANTS}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.restaurantCard}
            activeOpacity={0.7}
            onPress={() => setSelectedRestaurant(item.id)}
          >
            <Text style={styles.restaurantEmoji}>{item.icon}</Text>
            <View style={styles.restaurantInfo}>
              <Text style={TYPOGRAPHY.body1}>{item.name}</Text>
              <Text style={TYPOGRAPHY.body2}>{item.cuisine}</Text>
              <View style={styles.restaurantMeta}>
                <Text style={styles.ratingText}>⭐ {item.rating}</Text>
                <Text style={styles.etaText}>{item.deliveryTime}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      />
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  restaurantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  restaurantEmoji: {
    fontSize: 36,
    marginRight: 15,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  ratingText: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: 'bold',
  },
  etaText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  menuPrice: {
    color: COLORS.secondary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  popularBadge: {
    backgroundColor: 'rgba(255, 165, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  popularText: {
    color: '#FFA500',
    fontSize: 11,
    fontWeight: 'bold',
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  cartBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    margin: 20,
    padding: 18,
    borderRadius: 999,
    gap: 12,
  },
  cartBadge: {
    backgroundColor: '#FFF',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 13,
  },
  cartText: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 18,
  },
  orderPlacedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  backToHubBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    marginTop: 30,
  },
});
