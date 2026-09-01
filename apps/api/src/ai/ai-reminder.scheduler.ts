import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { sendPushNotification } from '../common/push';
import { NotificationsService } from '../notifications/notifications.service';

// Polls for reminders/wake-ups the AI companion has scheduled and delivers
// them as push notifications when their fireAt time arrives. Runs every
// minute — reminders are user-scheduled minutes-to-hours out, so
// minute-level precision is enough.
@Injectable()
export class AiReminderScheduler {
  private readonly logger = new Logger(AiReminderScheduler.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleDueReminders() {
    const due = await this.prisma.aiReminder.findMany({
      where: { done: false, fireAt: { lte: new Date() } },
    });
    if (due.length === 0) return;

    for (const reminder of due) {
      const user = await this.prisma.user.findUnique({
        where: { id: reminder.userId },
      });
      if (user?.expoPushToken) {
        const delivered = await sendPushNotification(
          user.expoPushToken,
          reminder.title,
          reminder.prepNote ||
            'Your Guranda AI companion has a reminder for you.',
          { type: 'ai_reminder', reminderId: reminder.id },
        );
        this.logger.log(
          `Reminder ${reminder.id} for user ${reminder.userId}: ${delivered ? 'delivered' : 'delivery failed'}`,
        );
      } else {
        this.logger.log(
          `Reminder ${reminder.id} for user ${reminder.userId}: no push token registered, skipping delivery`,
        );
      }
      await this.notifications.create(
        reminder.userId,
        'ai.reminder',
        reminder.title,
        reminder.prepNote || 'Your Guranda AI companion has a reminder for you.',
        { reminderId: reminder.id },
      );
      await this.prisma.aiReminder.update({
        where: { id: reminder.id },
        data: { done: true, firedAt: new Date() },
      });
    }
  }
}
