import cron from 'node-cron';
import {resetMessageCounts} from '../cron/resetMessageCounts';
import {Database} from '../db/types';
import logger from '../utils/logger';
import {
  createNotificationService,
  NOTIFICATION_CONFIGS,
  NotificationType,
} from './notificationService';

/**
 * Registers recurring tasks (UTC). Call once at process startup with the shared `Database` singleton.
 */
export function registerScheduledJobs(db: Database): void {
  cron.schedule(
    '0 0 * * *',
    async () => {
      try {
        await resetMessageCounts(db);
      } catch (error) {
        logger.error('Scheduled resetMessageCounts failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    },
    {timezone: 'UTC'},
  );

  const notificationService = createNotificationService(db);

  for (const [type, cfg] of Object.entries(NOTIFICATION_CONFIGS)) {
    if (cfg.checkInterval >= 365 * 24 * 60 * 60 * 1000) {
      logger.debug('Skipping notification cron for disabled type', {type});
      continue;
    }

    const minutes = Math.max(1, Math.round(cfg.checkInterval / 60_000));
    const cronExpr =
      minutes >= 60
        ? `0 */${Math.round(minutes / 60)} * * *`
        : `*/${minutes} * * * *`;

    cron.schedule(cronExpr, async () => {
      try {
        await notificationService.checkAndSendNotifications(
          type as NotificationType,
        );
      } catch (error) {
        logger.error('Failed to run notification check', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          notificationType: type,
        });
      }
    });
  }
}
