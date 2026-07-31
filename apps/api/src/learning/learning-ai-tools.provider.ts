import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { LearningService } from './learning.service';

@Injectable()
export class LearningAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private learning: LearningService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('learning', [
        {
          name: 'searchCourses',
          description:
            'Search courses, optionally filtered by category and/or a search term.',
          inputSchema: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              search: { type: 'string' },
            },
          },
          permissionKey: 'learning.read',
          sensitive: false,
          defaultGranted: true,
          handler: (_ctx, input) =>
            this.learning.listCourses(input?.category, input?.search),
          describeResult: (_i, output: any[]) =>
            output.length === 0
              ? 'No courses found.'
              : output
                  .slice(0, 8)
                  .map((c) => `${c.id}: ${c.title} — ${c.price ?? 0} MSH`)
                  .join('\n'),
        },
        {
          name: 'searchTutors',
          description: 'Search tutors, optionally filtered by subject.',
          inputSchema: {
            type: 'object',
            properties: { subject: { type: 'string' } },
          },
          permissionKey: 'learning.read',
          sensitive: false,
          defaultGranted: true,
          handler: (_ctx, input) => this.learning.listTutors(input?.subject),
        },
        {
          name: 'myEnrollments',
          description: 'List courses the user is enrolled in, with progress.',
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'learning.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.learning.myEnrollments(ctx.userId),
        },
        {
          name: 'myCertificates',
          description: 'List certificates the user has earned.',
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'learning.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.learning.myCertificates(ctx.userId),
        },
        {
          name: 'myTutorSessions',
          description: 'List tutor sessions the user has booked as a student.',
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'learning.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.learning.myBookedSessions(ctx.userId),
        },
        {
          name: 'enroll',
          description:
            'Enroll the user in a course. May deduct MSH from the wallet. Requires approval.',
          inputSchema: {
            type: 'object',
            properties: { courseId: { type: 'string' } },
            required: ['courseId'],
          },
          permissionKey: 'learning.write',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) =>
            this.learning.enroll(ctx.userId, input.courseId),
          describeAction: (input) => `Enroll in course ${input.courseId}`,
          describeResult: (input) => `Enrolled in course ${input.courseId}.`,
        },
        {
          name: 'bookTutorSession',
          description: 'Book a session with a tutor. Requires approval.',
          inputSchema: {
            type: 'object',
            properties: {
              tutorId: { type: 'string' },
              scheduledAt: { type: 'string', description: 'ISO datetime' },
              topic: { type: 'string' },
            },
            required: ['tutorId', 'scheduledAt'],
          },
          permissionKey: 'learning.write',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) =>
            this.learning.bookSession(ctx.userId, input.tutorId, input),
          describeAction: (input) =>
            `Book a tutor session with ${input.tutorId} at ${input.scheduledAt}`,
          describeResult: () => 'Tutor session booked.',
        },
      ]),
    );
  }
}
