import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import WidgetCard, { WidgetCardProps } from './WidgetCard';
import RideStatusCard from './RideStatusCard';
import { SPACING } from '../../theme';

export interface ToolWidget {
  toolCallId: string;
  toolName: string;
  renderAs: string;
  data: any;
}

interface AiWidgetRendererProps {
  widgets: ToolWidget[];
  navigation: any;
}

// Navigates to a screen that lives inside the "Life" tab's nested stack
// (HubStackNavigator) — shopping/travel/carfind/eat detail screens all live
// there, one level deeper than AiChatScreen itself.
function navigateToLife(navigation: any, screen: string, params: any) {
  navigation.navigate('Main', { screen: 'Life', params: { screen, params } });
}

function money(n: number | undefined | null): string {
  return `${Number(n ?? 0).toFixed(2)} MSH`;
}

function buildCardProps(renderAs: string, item: any, navigation: any): WidgetCardProps | null {
  switch (renderAs) {
    case 'product-list':
      return {
        imageUrl: item.imageUrl,
        placeholderIcon: 'bag-handle',
        title: item.name,
        priceLabel: money(item.price),
        metaLines: [
          item.store?.name ? `Sold by ${item.store.name}` : '',
          item.store?.rating ? `★ ${item.store.rating.toFixed(1)}` : '',
        ].filter(Boolean),
        onPress: () => navigateToLife(navigation, 'ShoppingProduct', { productId: item.id }),
      };
    case 'stay-list':
      return {
        imageUrl: item.imageUrl,
        placeholderIcon: 'bed',
        title: item.title,
        priceLabel: `${money(item.pricePerNight)}/night`,
        metaLines: [item.location, item.rating ? `★ ${item.rating.toFixed(1)}` : ''].filter(Boolean),
        onPress: () => navigateToLife(navigation, 'TravelStayDetail', { stayId: item.id }),
      };
    case 'flight-list':
      return {
        imageUrl: undefined,
        placeholderIcon: 'airplane',
        badge: `${item.airline} ${item.flightNumber}`,
        title: `${item.origin} → ${item.destination}`,
        priceLabel: money(item.price),
        metaLines: [
          `Departs ${new Date(item.departureTime).toLocaleString()}`,
          `${item.seatsAvailable} seats left`,
        ],
        onPress: () => navigateToLife(navigation, 'TravelFlightDetail', { flightId: item.id }),
      };
    case 'car-list':
      return {
        imageUrl: item.imageUrl,
        placeholderIcon: 'car-sport',
        title: `${item.make} ${item.model}`,
        priceLabel: `${money(item.pricePerDay)}/day`,
        metaLines: [item.category, item.location].filter(Boolean),
        onPress: () => navigateToLife(navigation, 'TravelCarDetail', { carId: item.id }),
      };
    case 'listing-list':
      return {
        imageUrl: item.images?.[0],
        placeholderIcon: 'pricetag',
        badge: item.listingType === 'AUCTION' ? 'AUCTION' : undefined,
        title: item.title,
        priceLabel: money(item.currentBid ?? item.price),
        metaLines: [item.category, item.condition].filter(Boolean),
        onPress: () => navigation.navigate('MarketplaceDetail', { listingId: item.id }),
      };
    case 'carfind-list':
      return {
        imageUrl: item.images?.[0],
        placeholderIcon: 'car',
        title: `${item.year} ${item.make} ${item.model}`,
        priceLabel: money(item.price),
        metaLines: [
          `${item.mileage?.toLocaleString?.() ?? item.mileage}km · ${item.transmission}`,
          item.location,
        ].filter(Boolean),
        onPress: () => navigateToLife(navigation, 'CarFindDetail', { carId: item.id }),
      };
    case 'store-list':
      return {
        imageUrl: item.coverUrl || item.logoUrl,
        placeholderIcon: 'restaurant',
        badge: item.isOpen ? 'OPEN' : 'CLOSED',
        title: item.name,
        metaLines: [item.category, item.rating ? `★ ${item.rating.toFixed(1)}` : ''].filter(Boolean),
        onPress: () => navigateToLife(navigation, 'EatStore', { storeId: item.id }),
      };
    case 'property-list':
      return {
        imageUrl: item.images?.[0],
        placeholderIcon: 'home',
        badge: item.listingType === 'RENT' ? 'TO RENT' : 'FOR SALE',
        title: item.title,
        priceLabel: `${money(item.price)}${item.listingType === 'RENT' ? '/month' : ''}`,
        metaLines: [
          item.address,
          item.bedrooms !== undefined ? `${item.bedrooms} bed · ${item.bathrooms} bath` : '',
        ].filter(Boolean),
        onPress: () => navigation.navigate('PropertyDetail', { propertyId: item.id }),
      };
    default:
      return null;
  }
}

export default function AiWidgetRenderer({ widgets, navigation }: AiWidgetRendererProps) {
  if (!widgets || widgets.length === 0) return null;

  return (
    <View style={styles.container}>
      {widgets.map((widget) => {
        if (widget.renderAs === 'ride-status') {
          const ride = widget.data;
          return (
            <RideStatusCard
              key={widget.toolCallId}
              status={ride.status}
              pickupAddress={ride.pickupAddress}
              dropoffAddress={ride.dropoffAddress}
              fare={ride.fare}
            />
          );
        }

        const items: any[] = Array.isArray(widget.data) ? widget.data : [];
        const cards = items
          .slice(0, 10)
          .map((item) => buildCardProps(widget.renderAs, item, navigation))
          .filter((c): c is WidgetCardProps => c !== null);

        if (cards.length === 0) return null;

        return (
          <ScrollView
            key={widget.toolCallId}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
          >
            {cards.map((card, i) => (
              <WidgetCard key={i} {...card} />
            ))}
          </ScrollView>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACING.sm, marginTop: 6, alignSelf: 'stretch' },
  row: { gap: SPACING.sm, paddingRight: SPACING.lg },
});
