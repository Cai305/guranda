import { Controller, Post, Get, Req, Res, UseGuards } from '@nestjs/common';
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

// Exposes the Tool Registry's non-sensitive (read) tools over the Model
// Context Protocol, so any MCP-compatible client (Claude Desktop, Claude
// Code, etc.) can call into Guranda's capabilities directly. Auth: paste
// this app's normal JWT as a Bearer token into the MCP client's config —
// no separate MCP OAuth flow is implemented.
//
// Stateless mode (one Server+Transport pair per request, no session store)
// — simplest correct option for a request-scoped NestJS controller, and
// sufficient since sensitive/action tools (the only ones that would benefit
// from a longer-lived session) aren't exposed here anyway.
@Controller('mcp')
@UseGuards(JwtAuthGuard)
export class McpController {
  constructor(
    private registry: ToolRegistryService,
    private executor: ActionExecutorService,
    private prisma: PrismaService,
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

  private buildServer(userId: string, grantedKeys: string[]): Server {
    const server = new Server(
      { name: 'guranda', version: '1.0.0' },
      { capabilities: { tools: {} } },
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: toMcpTools(
        this.registry.listTools({ permissionKeys: grantedKeys }),
      ) as any,
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const tool = this.registry.hasTool(name)
        ? this.registry.getTool(name)
        : null;

      if (!tool || tool.sensitive) {
        return {
          content: [
            {
              type: 'text',
              text: `Tool "${name}" is not available over MCP (sensitive/action tools require in-app confirmation).`,
            },
          ],
          isError: true,
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
