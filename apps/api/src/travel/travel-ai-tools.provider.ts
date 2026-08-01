import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { TravelService } from './travel.service';

@Injectable()
export class TravelAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private travel: TravelService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('travel', [
        {
          name: 'searchStays',
          description:
            'Search available stays (hotels/rentals), optionally filtered by location.',
          inputSchema: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'City or area to search in',
              },
            },
          },
          permissionKey: 'travel.read',
          sensitive: false,
          defaultGranted: true,
          renderAs: 'stay-list',
          handler: (_ctx, input) =>
            this.travel.listStays({ location: input?.location }),
          describeResult: (_i, output: any[]) =>
            output.length === 0
              ? 'No stays found.'
              : output
                  .slice(0, 8)
                  .map(
                    (s) =>
                      `${s.title} — ${s.location} — ${s.pricePerNight} MSH/night`,
                  )
                  .join('\n'),
        },
        {
          name: 'myTrips',
          description: "List the user's booked trips (stays, cars, flights, packages) as a single unified itinerary.",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'travel.read',
          sensitive: false,
          defaultGranted: true,
          renderAs: 'trip-list',
          handler: (ctx) => this.travel.myTrips(ctx.userId),
          describeResult: (_i, output: any[]) =>
            output.length === 0
              ? 'No booked trips yet.'
              : output
                  .slice(0, 10)
                  .map((t) => `${t.type}: ${t.title} — ${t.subtitle} — ${t.dateLabel} — ${t.totalPrice} MSH — ${t.status}`)
                  .join('\n'),
        },
        {
          name: 'bookStay',
          description: 'Book a stay for the user. Requires approval.',
          inputSchema: {
            type: 'object',
            properties: {
              stayId: { type: 'string' },
              checkIn: { type: 'string', description: 'ISO date' },
              checkOut: { type: 'string', description: 'ISO date' },
              guests: { type: 'number' },
            },
            required: ['stayId', 'checkIn', 'checkOut'],
          },
          permissionKey: 'travel.book',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) => this.travel.bookStay(ctx.userId, input),
          describeAction: (input) =>
            `Book stay ${input.stayId} from ${input.checkIn} to ${input.checkOut}`,
          describeResult: (input) =>
            `Booked stay ${input.stayId} from ${input.checkIn} to ${input.checkOut}.`,
        },
        {
          name: 'searchFlights',
          description:
            'Search available flights, optionally filtered by origin and/or destination city.',
          inputSchema: {
            type: 'object',
            properties: {
              origin: { type: 'string', description: 'Departure city' },
              destination: { type: 'string', description: 'Arrival city' },
            },
          },
          permissionKey: 'travel.read',
          sensitive: false,
          defaultGranted: true,
          renderAs: 'flight-list',
          handler: (_ctx, input) =>
            this.travel.listFlights({
              origin: input?.origin,
              destination: input?.destination,
            }),
          describeResult: (_i, output: any[]) =>
            output.length === 0
              ? 'No flights found for that route.'
              : output
                  .slice(0, 8)
                  .map(
                    (f) =>
                      `${f.id}: ${f.airline} ${f.flightNumber} ${f.origin}→${f.destination}, departs ${new Date(f.departureTime).toISOString()}, arrives ${new Date(f.arrivalTime).toISOString()}, ${f.price} MSH, ${f.seatsAvailable} seats left`,
                  )
                  .join('\n'),
        },
        {
          name: 'bookFlight',
          description:
            'Book a flight for the user. Deducts MSH from their wallet. Requires approval.',
          inputSchema: {
            type: 'object',
            properties: {
              flightId: {
                type: 'string',
                description: 'The flight id returned by searchFlights',
              },
              passengers: {
                type: 'number',
                description: 'Number of passengers, defaults to 1',
              },
            },
            required: ['flightId'],
          },
          permissionKey: 'travel.book',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) => this.travel.bookFlight(ctx.userId, input),
          describeAction: (input) =>
            `Book flight ${input.flightId}${input.passengers ? ` for ${input.passengers} passenger(s)` : ''}`,
          describeResult: (input, output: any) =>
            `Booked flight ${input.flightId} — total ${output?.totalPrice ?? '?'} MSH.`,
        },
        {
          name: 'searchCars',
          description:
            'Search available rental cars, optionally filtered by category and/or location.',
          inputSchema: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                description: 'e.g. Economy, SUV, Sedan',
              },
              location: { type: 'string', description: 'City or area' },
            },
          },
          permissionKey: 'travel.read',
          sensitive: false,
          defaultGranted: true,
          renderAs: 'car-list',
          handler: (_ctx, input) =>
            this.travel.listCars({
              category: input?.category,
              location: input?.location,
            }),
          describeResult: (_i, output: any[]) =>
            output.length === 0
              ? 'No rental cars found.'
              : output
                  .slice(0, 8)
                  .map(
                    (c) =>
                      `${c.id}: ${c.make} ${c.model} (${c.category}) — ${c.location} — ${c.pricePerDay} MSH/day`,
                  )
                  .join('\n'),
        },
        {
          name: 'bookCar',
          description:
            'Book a rental car for the user. Deducts MSH from their wallet. Requires approval.',
          inputSchema: {
            type: 'object',
            properties: {
              carId: {
                type: 'string',
                description: 'The car id returned by searchCars',
              },
              pickupDate: { type: 'string', description: 'ISO date' },
              returnDate: { type: 'string', description: 'ISO date' },
            },
            required: ['carId', 'pickupDate', 'returnDate'],
          },
          permissionKey: 'travel.book',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) => this.travel.bookCar(ctx.userId, input),
          describeAction: (input) =>
            `Book rental car ${input.carId} from ${input.pickupDate} to ${input.returnDate}`,
          describeResult: (input, output: any) =>
            `Booked car ${input.carId} from ${input.pickupDate} to ${input.returnDate} — total ${output?.totalPrice ?? '?'} MSH.`,
        },
      ]),
    );
  }
}
