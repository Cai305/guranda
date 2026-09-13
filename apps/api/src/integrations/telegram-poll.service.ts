import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { decryptSecret } from '../common/crypto.util';
import { getTelegramUpdates } from './adapters/telegram.adapter';

// Real "receiving messages" mechanism for Telegram (Phase 6). A Bot API bot
// has no webhook set up in this dev environment (a public webhook isn't
// realistic for local dev — see telegram-ai-tools.provider.ts's module
// comment), so periodic getUpdates polling is the correct real approach:
// this is genuinely how Telegram bots receive messages without one.
//
// For every user with a connected Telegram integration, poll for updates
// newer than the last one this integration has confirmed
// (ExternalIntegration.telegramLastUpdateId), and for each new incoming
// message create a real Guranda Notification — "Guranda as the unified
// layer" for a platform Nova can't otherwise surface to the user inside the
// app. One user's failure (bad/revoked token, Telegram API hiccup) must
// never take down the poll for everyone else, hence the per-integration
// try/catch.
@Injectable()
export class TelegramPollService {
  private readonly logger = new Logger(TelegramPollService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // Every 2 minutes — frequent enough to feel real without hammering
  // Telegram's API across every connected user.
  @Cron('*/2 * * * *')
  async pollAllConnectedUsers() {
    const rows = await this.prisma.externalIntegration.findMany({
      where: { provider: 'telegram' },
    });
    let usersPolled = 0;
    let notificationsCreated = 0;
    for (const row of rows) {
      try {
        const created = await this.pollOne(row);
        notificationsCreated += created;
        usersPolled += 1;
      } catch (e: any) {
        // Deliberately swallowed here (logged, not rethrown) — one user's
        // bad/revoked token must not stop the loop for the rest.
        this.logger.warn(
          `Telegram poll failed for integration ${row.id} (user ${row.userId}): ${e.message || e}`,
        );
      }
    }
    this.logger.log(
      `Telegram poll: ${usersPolled}/${rows.length} integration(s) polled, ${notificationsCreated} new notification(s).`,
    );
    return { usersPolled, totalIntegrations: rows.length, notificationsCreated };
  }

  private async pollOne(row: { id: string; userId: string; accessToken: string; telegramLastUpdateId: number | null }): Promise<number> {
    const token = decryptSecret(row.accessToken);
    const offset = row.telegramLastUpdateId !== null ? row.telegramLastUpdateId + 1 : undefined;
    const updates = await getTelegramUpdates(token, offset);
    if (updates.length === 0) return 0;

    for (const update of updates) {
      const from = update.fromUsername ? `@${update.fromUsername}` : update.fromFirstName || 'Someone';
      const preview = update.text ? (update.text.length > 140 ? `${update.text.slice(0, 140)}…` : update.text) : '(non-text message)';
      await this.notifications.create(
        row.userId,
        'telegram_message',
        `New Telegram message from ${from}`,
        preview,
        { chatId: update.chatId, updateId: update.updateId, fromUsername: update.fromUsername },
      );
    }

    const maxUpdateId = Math.max(...updates.map((u) => u.updateId));
    await this.prisma.externalIntegration.update({
      where: { id: row.id },
      data: { telegramLastUpdateId: maxUpdateId },
    });

    return updates.length;
  }
}
