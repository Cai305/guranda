import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { WorkService } from './work.service';

@Injectable()
export class WorkAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private work: WorkService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('work', [
        {
          name: 'searchJobs',
          description:
            'Search job listings, filtered by location type, employment type, category or a search term.',
          inputSchema: {
            type: 'object',
            properties: {
              locationType: {
                type: 'string',
                description: 'REMOTE, ONSITE, HYBRID',
              },
              employmentType: {
                type: 'string',
                description: 'FULL_TIME, PART_TIME, CONTRACT',
              },
              category: { type: 'string' },
              search: { type: 'string' },
            },
          },
          permissionKey: 'work.read',
          sensitive: false,
          defaultGranted: true,
          handler: (_ctx, input) => this.work.listJobs(input || {}),
          describeResult: (_i, output: any[]) =>
            output.length === 0
              ? 'No jobs found.'
              : output
                  .slice(0, 8)
                  .map(
                    (j) =>
                      `${j.id}: ${j.title} — ${j.locationType}, ${j.employmentType}`,
                  )
                  .join('\n'),
        },
        {
          name: 'searchGigs',
          description:
            'Search freelance gigs, filtered by category or a search term.',
          inputSchema: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              search: { type: 'string' },
            },
          },
          permissionKey: 'work.read',
          sensitive: false,
          defaultGranted: true,
          handler: (_ctx, input) => this.work.listGigs(input || {}),
          describeResult: (_i, output: any[]) =>
            output.length === 0
              ? 'No gigs found.'
              : output
                  .slice(0, 8)
                  .map((g) => `${g.id}: ${g.title} — ${g.budget ?? '?'} MSH`)
                  .join('\n'),
        },
        {
          name: 'myApplications',
          description: 'List job applications the user has submitted.',
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'work.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.work.getMyApplications(ctx.userId),
        },
        {
          name: 'myProposals',
          description: 'List freelance gig proposals the user has submitted.',
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'work.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.work.getMyProposals(ctx.userId),
        },
        {
          name: 'applyToJob',
          description:
            'Apply to a job listing. Requires approval — it notifies the employer.',
          inputSchema: {
            type: 'object',
            properties: {
              jobId: { type: 'string' },
              coverMessage: { type: 'string' },
              resumeUrl: { type: 'string' },
            },
            required: ['jobId'],
          },
          permissionKey: 'work.write',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) =>
            this.work.applyToJob(ctx.userId, input.jobId, input),
          describeAction: (input) => `Apply to job ${input.jobId}`,
          describeResult: (input) => `Applied to job ${input.jobId}.`,
        },
      ]),
    );
  }
}
