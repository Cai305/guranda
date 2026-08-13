import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { CarFindService } from './carfind.service';

@Injectable()
export class CarFindAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private carFind: CarFindService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('carfind', [
        {
          name: 'search',
          description:
            'Search car listings for sale, filtered by make, model, location, body type, fuel type, transmission, condition, price range and/or max mileage.',
          inputSchema: {
            type: 'object',
            properties: {
              make: { type: 'string' },
              model: { type: 'string' },
              location: { type: 'string' },
              bodyType: {
                type: 'string',
                description: 'SEDAN, HATCHBACK, SUV, BAKKIE, COUPE, VAN',
              },
              fuelType: {
                type: 'string',
                description: 'PETROL, DIESEL, HYBRID, ELECTRIC',
              },
              transmission: {
                type: 'string',
                description: 'MANUAL, AUTOMATIC',
              },
              condition: { type: 'string', description: 'NEW, USED' },
              minPrice: { type: 'number' },
              maxPrice: { type: 'number' },
              maxMileage: { type: 'number' },
            },
          },
          permissionKey: 'carfind.read',
          sensitive: false,
          defaultGranted: true,
          renderAs: 'carfind-list',
          handler: (_ctx, input) => this.carFind.browse(input),
          // Leads with a total + year-by-year tally (cars are naturally
          // grouped by model year, unlike most other search-result tools)
          // so the LLM can actually relay "found N: 2 from 2020, 3 from
          // 2021" instead of only seeing an unlabeled row dump.
          describeResult: (_i, output: any[]) => {
            if (output.length === 0) return 'No cars found matching that search.';
            const byYear = new Map<number, number>();
            for (const c of output) byYear.set(c.year, (byYear.get(c.year) ?? 0) + 1);
            const yearTally = [...byYear.entries()]
              .sort((a, b) => b[0] - a[0])
              .map(([year, count]) => `${count} from ${year}`)
              .join(', ');
            const rows = output
              .slice(0, 8)
              .map(
                (c) =>
                  `${c.id}: ${c.year} ${c.make} ${c.model} — ${c.mileage}km, ${c.transmission}, ${c.fuelType}, ${c.condition} — ${c.price} MSH — ${c.location} — seller ${c.seller?.username}`,
              )
              .join('\n');
            return `Found ${output.length} car(s): ${yearTally}.\n${rows}`;
          },
        },
        {
          name: 'myListings',
          description:
            "List the user's own car listings and any enquiries received on them.",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'carfind.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.carFind.myListings(ctx.userId),
        },
        {
          name: 'myEnquiries',
          description:
            "List enquiries the user has sent to sellers about cars they're interested in.",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'carfind.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.carFind.myEnquiries(ctx.userId),
        },
        {
          name: 'listCar',
          description:
            'Publish a new car listing for sale. Requires approval — it becomes visible to every buyer.',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              make: { type: 'string' },
              model: { type: 'string' },
              year: { type: 'number' },
              price: { type: 'number' },
              mileage: { type: 'number' },
              transmission: { type: 'string' },
              fuelType: { type: 'string' },
              bodyType: { type: 'string' },
              condition: { type: 'string' },
              location: { type: 'string' },
              description: { type: 'string' },
              images: {
                type: 'array',
                items: { type: 'string' },
                description: 'At least 3 image URLs',
              },
            },
            required: [
              'title',
              'make',
              'model',
              'year',
              'price',
              'location',
              'images',
            ],
          },
          permissionKey: 'carfind.write',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) =>
            this.carFind.createListing(ctx.userId, input),
          describeAction: (input) =>
            `Publish a car listing: ${input.year} ${input.make} ${input.model} for ${input.price} MSH`,
          describeResult: (input) =>
            `Published listing: ${input.year} ${input.make} ${input.model} for ${input.price} MSH.`,
        },
        {
          name: 'enquire',
          description:
            "Send an enquiry message to a car listing's seller. Requires approval — it's delivered to a real person.",
          inputSchema: {
            type: 'object',
            properties: {
              listingId: { type: 'string' },
              message: { type: 'string' },
            },
            required: ['listingId', 'message'],
          },
          permissionKey: 'carfind.write',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) =>
            this.carFind.sendEnquiry(
              ctx.userId,
              input.listingId,
              input.message,
            ),
          describeAction: (input) =>
            `Send enquiry about listing ${input.listingId}: "${input.message}"`,
          describeResult: () => 'Enquiry sent to the seller.',
        },
      ]),
    );
  }
}
