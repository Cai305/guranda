import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../theme/useThemedStyles';

export default function HairServiceScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const { service, profile } = route.params;

  // Keep track of which required items the user wants to buy from the hairdresser
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});

  const toggleItem = (itemId: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const selectedItemIds = Object.keys(selectedItems).filter(id => selectedItems[id]);
  const itemsCost = service.requiredItems?.reduce((acc: number, item: any) => {
    if (selectedItems[item.id]) return acc + item.price;
    return acc;
  }, 0) || 0;

  const totalCost = service.price + itemsCost;

  const handleBook = () => {
    navigation.navigate('HairBooking', {
      service,
      profile,
      selectedItemIds,
      totalCost
    });
  };

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
    content: {
      padding: 20,
      paddingBottom: 40,
    },
    image: {
      width: '100%',
      height: 250,
      borderRadius: 16,
    },
    section: {
      marginTop: 30,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
    },
    itemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: COLORS.border,
      marginBottom: 12,
    },
    itemCardSelected: {
      borderColor: COLORS.primary,
      backgroundColor: COLORS.primary + '11',
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: COLORS.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
      backgroundColor: COLORS.surface,
    },
    itemImage: {
      width: 50,
      height: 50,
      borderRadius: 8,
    },
    itemInfo: {
      flex: 1,
      marginLeft: 12,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    bookButton: {
      backgroundColor: COLORS.primary,
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: 12,
    },
  }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h3}>Service Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Image
          source={{ uri: service.images?.[0] || 'https://via.placeholder.com/400' }}
          style={styles.image}
        />
        <Text style={[TYPOGRAPHY.h2, { marginTop: 16 }]}>{service.title}</Text>
        <Text style={[TYPOGRAPHY.h3, { color: COLORS.primary, marginTop: 8 }]}>R{service.price}</Text>
        <Text style={[TYPOGRAPHY.body2, { color: COLORS.textMuted, marginTop: 4 }]}>{service.duration} mins</Text>
        
        <Text style={[TYPOGRAPHY.body1, { marginTop: 16, lineHeight: 22 }]}>
          {service.description}
        </Text>

        {service.requiredItems && service.requiredItems.length > 0 && (
          <View style={styles.section}>
            <Text style={TYPOGRAPHY.h3}>Required Items</Text>
            <Text style={[TYPOGRAPHY.body2, { color: COLORS.textMuted, marginBottom: 12 }]}>
              You can buy these items directly from {profile.businessName} or choose to bring your own.
            </Text>

            {service.requiredItems.map((item: any) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.itemCard,
                  selectedItems[item.id] ? styles.itemCardSelected : null
                ]}
                activeOpacity={0.7}
                onPress={() => toggleItem(item.id)}
              >
                <View style={styles.checkbox}>
                  {selectedItems[item.id] && <Ionicons name="checkmark" size={16} color="#FFF" />}
                </View>
                <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                <View style={styles.itemInfo}>
                  <Text style={TYPOGRAPHY.body1}>{item.name}</Text>
                  <Text style={[TYPOGRAPHY.h4, { color: COLORS.primary }]}>+ R{item.price}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={TYPOGRAPHY.body2}>Total</Text>
          <Text style={TYPOGRAPHY.h2}>R{totalCost}</Text>
        </View>
        <TouchableOpacity style={styles.bookButton} onPress={handleBook}>
          <Text style={[TYPOGRAPHY.h3, { color: '#FFF' }]}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
