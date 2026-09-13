import { ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { WidgetDefinition } from './widget-registry.types';

// Item schema shared by every "list of cards" widget (WidgetCard in
// AiWidgetRenderer.tsx) — each widget below narrows `items` to its own
// item shape but the envelope (an array under `data`, one card per item)
// is identical across all 8 list-shaped renderAs values.
function listWidget(itemSchema: Record<string, unknown>): Record<string, unknown> {
  return {
    type: 'array',
    items: itemSchema,
  };
}

/**
 * The formal Widget Registry — the render-side counterpart to
 * ToolRegistryService. Seeded at construction with exactly the renderAs
 * values actually emitted by a ToolDefinition today (grepped from every
 * *-ai-tools.provider.ts — see property/travel/ride/shopping/carfind/
 * marketplace/eat providers), so this can never advertise a widget type
 * nothing in the tool registry actually produces. AiWidgetRenderer.tsx's
 * switch(renderAs) is the real client-side rendering logic and stays the
 * source of truth for HOW each type renders; this registry is the
 * queryable manifest of WHAT types exist and what shape they expect.
 */
@Injectable()
export class WidgetRegistryService implements OnModuleInit {
  private widgets = new Map<string, WidgetDefinition>();

  onModuleInit() {
    this.registerMany(BUILT_IN_WIDGETS);
  }

  register(widget: WidgetDefinition): void {
    if (this.widgets.has(widget.id)) {
      throw new ConflictException(`Widget "${widget.id}" is already registered`);
    }
    this.widgets.set(widget.id, widget);
  }

  registerMany(widgets: WidgetDefinition[]): void {
    widgets.forEach((w) => this.register(w));
  }

  getWidget(id: string): WidgetDefinition {
    const widget = this.widgets.get(id);
    if (!widget) throw new NotFoundException(`Widget "${id}" not found`);
    return widget;
  }

  hasWidget(id: string): boolean {
    return this.widgets.has(id);
  }

  listWidgets(): WidgetDefinition[] {
    return Array.from(this.widgets.values());
  }
}

const BUILT_IN_WIDGETS: WidgetDefinition[] = [
  {
    id: 'product-list',
    renderAs: 'product-list',
    description: 'A shopping product result — used by shopping.searchProducts. Tapping a card navigates to the product detail screen; supports a "buy" voice action.',
    inputSchema: listWidget({
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        imageUrl: { type: 'string' },
        price: { type: 'number' },
        store: { type: 'object', properties: { name: { type: 'string' }, rating: { type: 'number' } } },
      },
      required: ['id', 'name', 'price'],
    }),
  },
  {
    id: 'stay-list',
    renderAs: 'stay-list',
    description: 'A travel accommodation result — used by travel.searchStays. Tapping a card navigates to the stay detail screen.',
    inputSchema: listWidget({
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        imageUrl: { type: 'string' },
        pricePerNight: { type: 'number' },
        location: { type: 'string' },
        rating: { type: 'number' },
      },
      required: ['id', 'title', 'pricePerNight'],
    }),
  },
  {
    id: 'flight-list',
    renderAs: 'flight-list',
    description: 'A flight search result — used by travel.searchFlights. Tapping a card navigates to the flight detail screen.',
    inputSchema: listWidget({
      type: 'object',
      properties: {
        id: { type: 'string' },
        airline: { type: 'string' },
        flightNumber: { type: 'string' },
        origin: { type: 'string' },
        destination: { type: 'string' },
        departureTime: { type: 'string' },
        price: { type: 'number' },
        seatsAvailable: { type: 'number' },
      },
      required: ['id', 'origin', 'destination', 'price'],
    }),
  },
  {
    id: 'car-list',
    renderAs: 'car-list',
    description: 'A car rental result — used by travel.searchCars. Tapping a card navigates to the car detail screen.',
    inputSchema: listWidget({
      type: 'object',
      properties: {
        id: { type: 'string' },
        make: { type: 'string' },
        model: { type: 'string' },
        imageUrl: { type: 'string' },
        pricePerDay: { type: 'number' },
        category: { type: 'string' },
        location: { type: 'string' },
      },
      required: ['id', 'make', 'model', 'pricePerDay'],
    }),
  },
  {
    id: 'listing-list',
    renderAs: 'listing-list',
    description: 'A marketplace listing (fixed-price or auction) — used by marketplace tools. Tapping a card navigates to the listing detail screen.',
    inputSchema: listWidget({
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        images: { type: 'array', items: { type: 'string' } },
        listingType: { type: 'string', enum: ['FIXED', 'AUCTION'] },
        price: { type: 'number' },
        currentBid: { type: 'number' },
        category: { type: 'string' },
        condition: { type: 'string' },
      },
      required: ['id', 'title'],
    }),
  },
  {
    id: 'carfind-list',
    renderAs: 'carfind-list',
    description: 'A used-car classifieds result — used by carfind tools. Tapping a card navigates to the CarFind detail screen.',
    inputSchema: listWidget({
      type: 'object',
      properties: {
        id: { type: 'string' },
        year: { type: 'number' },
        make: { type: 'string' },
        model: { type: 'string' },
        images: { type: 'array', items: { type: 'string' } },
        price: { type: 'number' },
        mileage: { type: 'number' },
        transmission: { type: 'string' },
        location: { type: 'string' },
      },
      required: ['id', 'make', 'model', 'price'],
    }),
  },
  {
    id: 'store-list',
    renderAs: 'store-list',
    description: 'An Eat store/restaurant result — used by eat.searchStores. Tapping a card navigates to the store menu screen.',
    inputSchema: listWidget({
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        coverUrl: { type: 'string' },
        logoUrl: { type: 'string' },
        isOpen: { type: 'boolean' },
        category: { type: 'string' },
        rating: { type: 'number' },
      },
      required: ['id', 'name'],
    }),
  },
  {
    id: 'property-list',
    renderAs: 'property-list',
    description: 'A property (rent/sale) result — used by property tools. Tapping a card navigates to the property detail screen.',
    inputSchema: listWidget({
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        images: { type: 'array', items: { type: 'string' } },
        listingType: { type: 'string', enum: ['RENT', 'SALE'] },
        price: { type: 'number' },
        address: { type: 'string' },
        bedrooms: { type: 'number' },
        bathrooms: { type: 'number' },
      },
      required: ['id', 'title', 'price'],
    }),
  },
  {
    id: 'trip-list',
    renderAs: 'trip-list',
    description: 'A single-purpose list of the caller\'s own booked trips — used by travel.listTrips. Renders as TripCard, not the shared WidgetCard; supports next/previous but not select/buy.',
    inputSchema: listWidget({
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
      required: ['id'],
    }),
  },
  {
    id: 'ride-status',
    renderAs: 'ride-status',
    description: 'A single-purpose live status card for the caller\'s current ride — used by ride.request and ride tracking tools. `data` is one object, not a list; renders as RideStatusCard; supports cancel/track voice actions.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        pickupAddress: { type: 'string' },
        dropoffAddress: { type: 'string' },
        fare: { type: 'number' },
        distanceKm: { type: 'number' },
        driver: { type: 'object', properties: { username: { type: 'string' } } },
        driverProfile: {
          type: 'object',
          properties: {
            rating: { type: 'number' },
            totalRides: { type: 'number' },
            vehicleMake: { type: 'string' },
            vehicleModel: { type: 'string' },
            vehiclePlate: { type: 'string' },
          },
        },
      },
      required: ['status'],
    },
  },
];
