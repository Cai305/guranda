import React from 'react';
import { View, ScrollView } from 'react-native';
import WidgetCard, { WidgetCardProps } from './WidgetCard';
import RideStatusCard from './RideStatusCard';
import TripCard, { Trip } from './TripCard';
import { useThemedStyles } from '../../theme/useThemedStyles';
import PlatformWidget from '../widgets/PlatformWidget';
import { PlatformWidgetData } from '../widgets/platformWidget';
import { formatCurrency } from '../../utils/format';

export interface ToolWidget {
  toolCallId: string;
  toolName: string;
  renderAs: string;
  data: any;
  /** Set when a "next" / "previous" / "the second one" message has been
   * resolved against this widget (see WidgetActionResolverService, server —
   * this never comes back with fresh `data`, just an updated index onto the
   * same list already rendered). */
  selectedIndex?: number;
}

interface AiWidgetRendererProps {
  widgets: ToolWidget[];
  navigation: any;
}

// AI tools can return a single portable widget (or a list of them). This is
// the same data contract used by chat messages and comment bodies.
function platformWidgets(widget: ToolWidget): PlatformWidgetData[] {
  if (widget.renderAs !== 'platform-widget' && widget.renderAs !== 'widget') return [];
  const data = Array.isArray(widget.data) ? widget.data : [widget.data];
  return data.filter((item): item is PlatformWidgetData => !!item && typeof item.title === 'string' && typeof item.type === 'string');
}

// Navigates to a screen that lives inside the "Life" tab's nested stack
// (HubStackNavigator) — shopping/travel/carfind/eat detail screens all live
// there, one level deeper than AiChatScreen itself.
function navigateToLife(navigation: any, screen: string, params: any) {
  navigation.navigate('Main', { screen: 'Life', params: { screen, params } });
}

function money(n: number | undefined | null): string {
  return formatCurrency(Number(n ?? 0));
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
        actionLabel: 'VIEW PRODUCT',
        onPress: () => navigateToLife(navigation, 'ShoppingProduct', { productId: item.id }),
      };
    case 'stay-list':
      return {
        imageUrl: item.imageUrl,
        placeholderIcon: 'bed',
        title: item.title,
        priceLabel: `${money(item.pricePerNight)}/night`,
        metaLines: [item.location, item.rating ? `★ ${item.rating.toFixed(1)}` : ''].filter(Boolean),
        actionLabel: 'BOOK STAY',
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
        actionLabel: 'BOOK FLIGHT',
        onPress: () => navigateToLife(navigation, 'TravelFlightDetail', { flightId: item.id }),
      };
    case 'car-list':
      return {
        imageUrl: item.imageUrl,
        placeholderIcon: 'car-sport',
        title: `${item.make} ${item.model}`,
        priceLabel: `${money(item.pricePerDay)}/day`,
        metaLines: [item.category, item.location].filter(Boolean),
        actionLabel: 'RENT CAR',
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
        actionLabel: item.listingType === 'AUCTION' ? 'PLACE BID' : 'VIEW LISTING',
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
        actionLabel: 'VIEW CAR',
        onPress: () => navigateToLife(navigation, 'CarFindDetail', { carId: item.id }),
      };
    case 'store-list':
      return {
        imageUrl: item.coverUrl || item.logoUrl,
        placeholderIcon: 'restaurant',
        badge: item.isOpen ? 'OPEN' : 'CLOSED',
        title: item.name,
        metaLines: [item.category, item.rating ? `★ ${item.rating.toFixed(1)}` : ''].filter(Boolean),
        actionLabel: 'VIEW MENU',
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
        actionLabel: 'VIEW PROPERTY',
        onPress: () => navigation.navigate('PropertyDetail', { propertyId: item.id }),
      };
    default:
      return null;
  }
}

export default function AiWidgetRenderer({ widgets, navigation }: AiWidgetRendererProps) {
  const styles = useThemedStyles(({ SPACING }) => ({
    container: { gap: SPACING.sm, marginTop: 6, alignSelf: 'stretch' },
    row: { gap: SPACING.sm, paddingRight: SPACING.lg },
    stack: { gap: SPACING.sm, alignSelf: 'stretch' },
  }));

  if (!widgets || widgets.length === 0) return null;

  return (
    <View style={styles.container}>
      {widgets.map((widget) => {
        const portable = platformWidgets(widget);
        if (portable.length) {
          return (
            <ScrollView key={widget.toolCallId} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
              {portable.slice(0, 10).map((item, i) => <PlatformWidget key={`${item.type}-${item.id || i}`} widget={item} navigation={navigation} compact />)}
            </ScrollView>
          );
        }
        if (widget.renderAs === 'trip-list') {
          const trips: Trip[] = Array.isArray(widget.data) ? widget.data : [];
          if (trips.length === 0) return null;
          return (
            <View key={widget.toolCallId} style={styles.stack}>
              {trips.slice(0, 10).map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </View>
          );
        }

        if (widget.renderAs === 'ride-status') {
          const ride = widget.data;
          return (
            <RideStatusCard
              key={widget.toolCallId}
              status={ride.status}
              pickupAddress={ride.pickupAddress}
              dropoffAddress={ride.dropoffAddress}
              fare={ride.fare}
              onPress={() => navigateToLife(navigation, 'Ride', {})}
            />
          );
        }

        const items: any[] = Array.isArray(widget.data) ? widget.data : [];
        const cards = items
          .slice(0, 10)
          .map((item) => buildCardProps(widget.renderAs, item, navigation));
        // buildCardProps switches on widget.renderAs (not per-item), so for
        // a homogeneous widget either every item produces props or none do —
        // index alignment with `items` (and therefore selectedIndex) holds
        // across this filter.
        const validCards = cards
          .map((card, i) => (card ? { card, i } : null))
          .filter((c): c is { card: WidgetCardProps; i: number } => c !== null);

        if (validCards.length === 0) return null;

        // Full-width stack (not a horizontal rail) so each card — and its
        // action button — reads clearly inside the AI tray/chat column.
        return (
          <View key={widget.toolCallId} style={styles.stack}>
            {validCards.map(({ card, i }) => (
              <WidgetCard key={i} {...card} selected={i === widget.selectedIndex} />
            ))}
          </View>
        );
      })}
    </View>
  );
}
