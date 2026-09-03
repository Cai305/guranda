import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('agent')
  async getAgent(@Request() req: any) {
    return (
      (await this.aiService.getAgent(req.user.userId)) ?? { exists: false }
    );
  }

  // For AiAccessScreen: the full catalog of grantable capabilities, driven by
  // the Tool Registry instead of a hardcoded list — any module that registers
  // a new tool shows up here automatically.
  @Get('tools')
  async listTools() {
    return this.aiService.listAvailableTools();
  }

  // For AiChatScreen: real past conversation, not just whatever's still open
  // in the client's in-memory bubbles array.
  @Get('history')
  async getHistory(@Request() req: any) {
    return this.aiService.getHistory(req.user.userId);
  }

  // Poll target for backgroundCapable tools (status 'started' returns an
  // executionId here) — e.g. finance.contribute, which settles on the real
  // XRPL testnet in the background rather than blocking the chat turn.
  @Get('executions/:id')
  async getExecution(@Request() req: any, @Param('id') id: string) {
    return this.aiService.getExecution(req.user.userId, id);
  }

  @Post('agent')
  async upsertAgent(@Request() req: any, @Body() body: any) {
    return this.aiService.upsertAgent(req.user.userId, body);
  }

  @Post('welcome')
  async welcome(@Request() req: any) {
    return this.aiService.welcome(req.user.userId);
  }

  @Post('chat')
  async chat(@Request() req: any, @Body() body: { messages: any[] }) {
    return this.aiService.chat(req.user.userId, body.messages || []);
  }

  @Post('resolve')
  async resolve(
    @Request() req: any,
    @Body() body: { conversation: any[]; action: any; approved: boolean },
  ) {
    return this.aiService.resolveAction(
      req.user.userId,
      body.conversation || [],
      body.action,
      !!body.approved,
    );
  }

  // Sipho, Thandi, Guranda AI Assistant — fixed, no-setup-required personas,
  // distinct from the user's own personal AiAgent above.
  @Get('companions')
  listCompanions(@Request() req: any) {
    return this.aiService.listCompanions(req.user.userId);
  }

  @Get('companions/:id/history')
  async companionHistory(@Request() req: any, @Param('id') id: string) {
    return this.aiService.getCompanionHistory(req.user.userId, id);
  }

  @Post('companions/:id/chat')
  async companionChat(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { message: string },
  ) {
    return this.aiService.companionChat(
      req.user.userId,
      id,
      body.message || '',
    );
  }
}
