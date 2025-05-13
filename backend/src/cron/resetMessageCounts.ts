import {Database} from '../db/types';
import {createMessageLimitService} from '../services/messageLimitService';
import logger from '../utils/logger';

export const resetMessageCounts = async (db: Database) => {
  try {
    const messageLimitService = createMessageLimitService(db);
    await messageLimitService.resetDailyMessageCount();
    logger.info('Daily message counts reset successfully');
  } catch (error) {
    logger.error('Failed to reset daily message counts', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
};
