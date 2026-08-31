import {
  Controller,
  Post,
  Get,
  Req,
  Res,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { JwtAuthGuard } from '../auth/auth.guard';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { ActionExecutorService } from '../ai-runtime/action-executor.service';
import { PrismaService } from '../prisma.service';
import { toMcpTools } from './mcp-tool-mapper';
import { McpPendingActionsService } from './mcp-pending-actions.service';

const CHECK_PENDING_TOOL = 'check_pending_action';

// Exposes the Tool Registry over the Model Context Protocol, so any
// MCP-compatible client (Claude Desktop, Claude Code, etc.) can call into
// Guranda's capabilities directly. Auth: paste this app's normal JWT as a
// Bearer token into the MCP client's config — no separate MCP OAuth flow is
// implemented.
//
// Read tools execute immediately. Sensitive/write tools (send money, book a
// ride, etc.) are parked as a PendingMcpAction instead — the user approves
// or declines from inside the app (push notification + a dedicated screen),
// exactly like the in-chat approval card. The external client discovers the
// outcome via the synthetic check_pending_action tool. See
// mcp-pending-actions.service.ts for the two-phase flow this implements.
//
// Stateless mode (one Server+Transport pair per request, no session store)
// — simplest correct option for a request-scoped NestJS controller; the
// pending-action record (not an MCP session) is what carries state across
// the approval round-trip, so statelessness here is still fine.
@Controller('mcp')
@UseGuards(JwtAuthGuard)
export class McpController {
  constructor(
    private registry: ToolRegistryService,
    private executor: ActionExecutorService,
    private prisma: PrismaService,
    private pendingActions: McpPendingActionsService,
  ) {}

  @Post()
  async handlePost(@Req() req: Request, @Res() res: Response) {
    const userId = (req as any).user.userId;
    // Least-privilege: tools/list must only ever show what THIS user has
    // actually granted the AI agent — mirrors the exact derivation
    // AgentRuntimeService.runLoop() uses for the chat surface, so MCP and
    // chat never disagree about what's "available" to a given user.
    const agent = await this.prisma.aiAgent.findUnique({ where: { userId } });
    const grantedKeys = Object.entries(
      (agent?.permissions || {}) as Record<string, boolean>,
    )
      .filter(([, v]) => v)
      .map(([k]) => k);
    const server = this.buildServer(userId, grantedKeys);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, (req as any).body);
  }

  // Stateless mode has no server-initiated notification stream to open.
  @Get()
  handleGet(@Res() res: Response) {
    res.status(405).json({
      message:
        'This MCP server runs in stateless mode; only POST is supported.',
    });
  }

  // In-app (not MCP-protocol) endpoints: the mobile client's own approval
  // screen for actions an EXTERNAL MCP client asked to run. Same JwtAuthGuard
  // as the rest of this controller — these are the app's own REST calls, on
  // the user's own JWT, not part of the MCP RPC surface.
  @Get('pending')
  async listPending(@Req() req: Request) {
    return this.pendingActions.listForUser((req as any).user.userId);
  }

  @Post('pending/:id/resolve')
  async resolvePending(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { approved: boolean },
  ) {
    return this.pendingActions.resolve(
      (req as any).user.userId,
      id,
      !!body.approved,
    );
  }

  private buildServer(userId: string, grantedKeys: string[]): Server {
    const server = new Server(
      { name: 'guranda', version: '1.0.0' },
      { capabilities: { tools: {} } },
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        ...toMcpTools(this.registry.listTools({ permissionKeys: grantedKeys })),
        {
          name: CHECK_PENDING_TOOL,
          description:
            'Check the status of a Guranda action that required in-app approval (returned by a sensitive tool call as a pending action id). Returns pending, executed, declined, or expired.',
          inputSchema: {
            type: 'object',
            properties: {
              pendingActionId: { type: 'string', description: 'The id returned by the original tool call' },
            },
            required: ['pendingActionId'],
          },
        },
      ] as any,
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === CHECK_PENDING_TOOL) {
        const id = (args as any)?.pendingActionId;
        const action = id
          ? await this.pendingActions.getStatus(userId, id)
          : null;
        if (!action) {
          return {
            content: [{ type: 'text', text: `No pending action found for id "${id}".` }],
            isError: true,
          };
        }
        const text =
          action.status === 'pending'
            ? `Still pending — ask the user to approve "${action.summary}" in the Guranda app.`
            : action.status === 'declined'
              ? `The user declined: ${action.summary}`
              : action.status === 'expired'
                ? `This request expired before the user responded: ${action.summary}`
                : action.resultText || 'Completed.';
        return { content: [{ type: 'text', text }] };
      }

      const tool = this.registry.hasTool(name)
        ? this.registry.getTool(name)
        : null;
      if (!tool) {
        return {
          content: [{ type: 'text', text: `Unknown tool "${name}".` }],
          isError: true,
        };
      }

      if (tool.sensitive) {
        // Never auto-run a sensitive tool for an external caller — park it
        // and require the same real in-app approval the chat surface uses.
        const pending = await this.pendingActions.createPending(
          userId,
          tool,
          args || {},
        );
        return {
          content: [
            {
              type: 'text',
              text: `Approval requested in the Guranda app: "${pending.summary}". Ask the user to approve or decline it there, then call ${CHECK_PENDING_TOOL} with pendingActionId "${pending.id}" to see the outcome.`,
            },
          ],
        };
      }

      const result = await this.executor.execute(userId, name, args || {});
      if (result.status === 'denied') {
        return {
          content: [{ type: 'text', text: result.resultText }],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: 'text',
            text: result.resultText || JSON.stringify(result.result),
          },
        ],
      };
    });

    return server;
  }
}
