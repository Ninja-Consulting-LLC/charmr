import {createMessageLimitService} from '../services/messageLimitService';
import logger from '../utils/logger';

export const resetMessageCounts = async () => {
  try {
    const messageLimitService = await createMessageLimitService();
    await messageLimitService.resetDailyMessageCount();
    logger.info('Daily message counts reset successfully');
  } catch (error) {
    logger.error('Failed to reset daily message counts', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
};
