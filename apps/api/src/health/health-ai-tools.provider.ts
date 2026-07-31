import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { HealthAppService } from './health-app.service';

@Injectable()
export class HealthAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private health: HealthAppService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('health', [
        {
          name: 'myFitnessLogs',
          description:
            "List the user's logged fitness activity, optionally filtered by type.",
          inputSchema: {
            type: 'object',
            properties: { type: { type: 'string' } },
          },
          permissionKey: 'health.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.health.getMyFitnessLogs(ctx.userId, input?.type),
        },
        {
          name: 'fitnessSummary',
          description: "Get a summary of the user's fitness activity.",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'health.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.health.getFitnessSummary(ctx.userId),
        },
        {
          name: 'searchPractitioners',
          description:
            'Search healthcare practitioners, optionally filtered by specialty.',
          inputSchema: {
            type: 'object',
            properties: { specialty: { type: 'string' } },
          },
          permissionKey: 'health.read',
          sensitive: false,
          defaultGranted: true,
          handler: (_ctx, input) =>
            this.health.listPractitioners(input?.specialty),
          describeResult: (_i, output: any[]) =>
            output.length === 0
              ? 'No practitioners found.'
              : output
                  .slice(0, 8)
                  .map(
                    (p: any) =>
                      `${p.id}: ${p.name || p.businessName} — ${p.specialty}`,
                  )
                  .join('\n'),
        },
        {
          name: 'myAppointments',
          description: "List the user's own healthcare appointments.",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'health.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.health.getMyAppointments(ctx.userId),
        },
        {
          name: 'searchPharmacyProducts',
          description:
            'Search pharmacy products, optionally filtered by category or a search term.',
          inputSchema: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              search: { type: 'string' },
            },
          },
          permissionKey: 'health.read',
          sensitive: false,
          defaultGranted: true,
          handler: (_ctx, input) => this.health.listProducts(input || {}),
          describeResult: (_i, output: any[]) =>
            output.length === 0
              ? 'No pharmacy products found.'
              : output
                  .slice(0, 8)
                  .map((p: any) => `${p.id}: ${p.name} — ${p.price} MSH`)
                  .join('\n'),
        },
        {
          name: 'myPharmacyOrders',
          description: "List the user's own pharmacy orders.",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'health.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.health.getMyOrders(ctx.userId),
        },
        {
          name: 'bookAppointment',
          description:
            'Book an appointment with a healthcare practitioner. Requires approval.',
          inputSchema: {
            type: 'object',
            properties: {
              practitionerId: { type: 'string' },
              scheduledAt: { type: 'string', description: 'ISO datetime' },
              reason: { type: 'string' },
            },
            required: ['practitionerId', 'scheduledAt'],
          },
          permissionKey: 'health.write',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) =>
            this.health.bookAppointment(
              ctx.userId,
              input.practitionerId,
              input,
            ),
          describeAction: (input) =>
            `Book an appointment with practitioner ${input.practitionerId} at ${input.scheduledAt}`,
          describeResult: () => 'Appointment booked.',
        },
        {
          name: 'orderMedicine',
          description:
            'Place a pharmacy order for delivery. Deducts MSH from the wallet. Requires approval.',
          inputSchema: {
            type: 'object',
            properties: {
              pharmacyId: { type: 'string' },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    productId: { type: 'string' },
                    quantity: { type: 'number' },
                  },
                  required: ['productId', 'quantity'],
                },
              },
              deliveryAddress: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['pharmacyId', 'items', 'deliveryAddress'],
          },
          permissionKey: 'health.write',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) => this.health.placeOrder(ctx.userId, input),
          describeAction: (input) =>
            `Order medicine (${input.items?.length ?? 0} item(s)) delivered to ${input.deliveryAddress}`,
          describeResult: () => 'Pharmacy order placed.',
        },
      ]),
    );
  }
}
