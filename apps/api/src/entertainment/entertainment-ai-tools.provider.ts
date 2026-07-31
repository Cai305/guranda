import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { EntertainmentService } from './entertainment.service';

@Injectable()
export class EntertainmentAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private entertainment: EntertainmentService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('entertainment', [
        {
          name: 'listMovies',
          description: 'List movies showing, optionally filtered by genre.',
          inputSchema: {
            type: 'object',
            properties: { genre: { type: 'string' } },
          },
          permissionKey: 'entertainment.read',
          sensitive: false,
          defaultGranted: true,
          handler: (_ctx, input) => this.entertainment.listMovies(input || {}),
          describeResult: (_i, output: any[]) =>
            output.length === 0
              ? 'No movies found.'
              : output
                  .slice(0, 8)
                  .map((m) => `${m.id}: ${m.title}`)
                  .join('\n'),
        },
        {
          name: 'listConcerts',
          description: 'List concerts, optionally filtered by city.',
          inputSchema: {
            type: 'object',
            properties: { city: { type: 'string' } },
          },
          permissionKey: 'entertainment.read',
          sensitive: false,
          defaultGranted: true,
          handler: (_ctx, input) =>
            this.entertainment.listConcerts(input || {}),
          describeResult: (_i, output: any[]) =>
            output.length === 0
              ? 'No concerts found.'
              : output
                  .slice(0, 8)
                  .map((c) => `${c.id}: ${c.artist} — ${c.title} — ${c.city}`)
                  .join('\n'),
        },
        {
          name: 'listEvents',
          description:
            'List live events, optionally filtered by category and/or city.',
          inputSchema: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              city: { type: 'string' },
            },
          },
          permissionKey: 'entertainment.read',
          sensitive: false,
          defaultGranted: true,
          handler: (_ctx, input) => this.entertainment.listEvents(input || {}),
          describeResult: (_i, output: any[]) =>
            output.length === 0
              ? 'No events found.'
              : output
                  .slice(0, 8)
                  .map((e) => `${e.id}: ${e.title} — ${e.city}`)
                  .join('\n'),
        },
        {
          name: 'myEvents',
          description: 'List live events the user organizes.',
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'entertainment.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.entertainment.myEvents(ctx.userId),
        },
        {
          name: 'bookMovie',
          description:
            'Book seats for a movie showtime. Deducts MSH from the wallet. Requires approval.',
          inputSchema: {
            type: 'object',
            properties: {
              showtimeId: { type: 'string' },
              seats: { type: 'number' },
            },
            required: ['showtimeId'],
          },
          permissionKey: 'entertainment.write',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) =>
            this.entertainment.bookMovieShowtime(
              ctx.userId,
              input.showtimeId,
              input,
            ),
          describeAction: (input) =>
            `Book ${input.seats || 1} seat(s) for showtime ${input.showtimeId}`,
          describeResult: () => 'Movie tickets booked.',
        },
        {
          name: 'bookConcert',
          description:
            'Book tickets for a concert. Deducts MSH from the wallet. Requires approval.',
          inputSchema: {
            type: 'object',
            properties: {
              concertId: { type: 'string' },
              tickets: { type: 'number' },
            },
            required: ['concertId'],
          },
          permissionKey: 'entertainment.write',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) =>
            this.entertainment.bookConcert(ctx.userId, input.concertId, input),
          describeAction: (input) =>
            `Book ${input.tickets || 1} ticket(s) for concert ${input.concertId}`,
          describeResult: () => 'Concert tickets booked.',
        },
        {
          name: 'bookEvent',
          description:
            'Book tickets for a live event. Deducts MSH from the wallet. Requires approval.',
          inputSchema: {
            type: 'object',
            properties: {
              eventId: { type: 'string' },
              tickets: { type: 'number' },
            },
            required: ['eventId'],
          },
          permissionKey: 'entertainment.write',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) =>
            this.entertainment.bookEvent(ctx.userId, input.eventId, input),
          describeAction: (input) =>
            `Book ${input.tickets || 1} ticket(s) for event ${input.eventId}`,
          describeResult: () => 'Event tickets booked.',
        },
      ]),
    );
  }
}
