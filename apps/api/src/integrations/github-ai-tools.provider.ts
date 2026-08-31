import { Injectable, OnModuleInit, BadRequestException } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { IntegrationsService } from './integrations.service';

const NOT_CONNECTED =
  "The user hasn't connected their GitHub account yet — suggest they connect it under Profile > External Apps.";

@Injectable()
export class GithubAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private integrations: IntegrationsService,
  ) {}

  private async accessToken(userId: string): Promise<string> {
    const token = await this.integrations.getValidAccessToken(userId, 'github');
    if (!token) throw new BadRequestException(NOT_CONNECTED);
    return token;
  }

  private async call(token: string, path: string, init?: RequestInit) {
    const res = await fetch(`https://api.github.com${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Guranda-App',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers || {}),
      },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new BadRequestException((data as any)?.message || `GitHub request failed (${res.status}).`);
    }
    return data;
  }

  onModuleInit() {
    this.registry.registerMany(
      defineTools('github', [
        {
          name: 'listIssues',
          description:
            "List open issues on a GitHub repository the user has connected (requires the user to have connected their GitHub account in Guranda settings).",
          inputSchema: {
            type: 'object',
            properties: {
              repo: { type: 'string', description: 'owner/repo, e.g. "anthropics/claude-code"' },
              state: { type: 'string', enum: ['open', 'closed', 'all'], description: 'Defaults to open' },
            },
            required: ['repo'],
          },
          permissionKey: 'github.listIssues',
          sensitive: false,
          defaultGranted: false,
          handler: async (ctx, input) => {
            const token = await this.accessToken(ctx.userId);
            const state = input.state || 'open';
            const data: any[] = await this.call(token, `/repos/${input.repo}/issues?state=${state}&per_page=20`);
            return {
              issues: data
                .filter((i) => !i.pull_request)
                .map((i) => ({ number: i.number, title: i.title, state: i.state, url: i.html_url })),
            };
          },
          describeResult: (_i, output: any) => {
            const issues = output?.issues ?? [];
            if (issues.length === 0) return 'No matching issues found.';
            return issues.map((i: any) => `#${i.number} ${i.title}`).join('; ');
          },
        },
        {
          name: 'listPullRequests',
          description: "List pull requests on a GitHub repository the user has connected.",
          inputSchema: {
            type: 'object',
            properties: {
              repo: { type: 'string', description: 'owner/repo' },
              state: { type: 'string', enum: ['open', 'closed', 'all'], description: 'Defaults to open' },
            },
            required: ['repo'],
          },
          permissionKey: 'github.listPullRequests',
          sensitive: false,
          defaultGranted: false,
          handler: async (ctx, input) => {
            const token = await this.accessToken(ctx.userId);
            const state = input.state || 'open';
            const data: any[] = await this.call(token, `/repos/${input.repo}/pulls?state=${state}&per_page=20`);
            return {
              pullRequests: data.map((p) => ({ number: p.number, title: p.title, state: p.state, url: p.html_url })),
            };
          },
          describeResult: (_i, output: any) => {
            const prs = output?.pullRequests ?? [];
            if (prs.length === 0) return 'No matching pull requests found.';
            return prs.map((p: any) => `#${p.number} ${p.title}`).join('; ');
          },
        },
        {
          name: 'createIssue',
          description: 'Create a new issue on a GitHub repository the user has connected. Requires approval.',
          inputSchema: {
            type: 'object',
            properties: {
              repo: { type: 'string', description: 'owner/repo' },
              title: { type: 'string' },
              body: { type: 'string' },
            },
            required: ['repo', 'title'],
          },
          permissionKey: 'github.createIssue',
          sensitive: true,
          defaultGranted: false,
          describeAction: (input) => `Create a GitHub issue on ${input.repo}: "${input.title}"`,
          handler: async (ctx, input) => {
            const token = await this.accessToken(ctx.userId);
            const data: any = await this.call(token, `/repos/${input.repo}/issues`, {
              method: 'POST',
              body: JSON.stringify({ title: input.title, body: input.body }),
            });
            return { created: true, number: data.number, url: data.html_url };
          },
          describeResult: (input, output: any) => `Created issue #${output.number} on ${input.repo}.`,
        },
        {
          name: 'commentOnIssue',
          description: 'Post a comment on a GitHub issue or pull request the user has connected. Requires approval.',
          inputSchema: {
            type: 'object',
            properties: {
              repo: { type: 'string', description: 'owner/repo' },
              issueNumber: { type: 'number' },
              body: { type: 'string' },
            },
            required: ['repo', 'issueNumber', 'body'],
          },
          permissionKey: 'github.commentOnIssue',
          sensitive: true,
          defaultGranted: false,
          describeAction: (input) => `Comment on ${input.repo}#${input.issueNumber}`,
          handler: async (ctx, input) => {
            const token = await this.accessToken(ctx.userId);
            const data: any = await this.call(token, `/repos/${input.repo}/issues/${input.issueNumber}/comments`, {
              method: 'POST',
              body: JSON.stringify({ body: input.body }),
            });
            return { created: true, url: data.html_url };
          },
          describeResult: (input) => `Commented on ${input.repo}#${input.issueNumber}.`,
        },
      ]),
    );
  }
}
