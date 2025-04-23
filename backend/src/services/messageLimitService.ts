import {getDatabase} from '../db';
import {MessageLimit} from '../db/types';
import logger from '../utils/logger';

export interface PlanLimits {
  dailyMessageLimit: number;
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    dailyMessageLimit: 5,
  },
  plus: {
    dailyMessageLimit: 50,
  },
  premium: {
    dailyMessageLimit: 200,
  },
};

export const createMessageLimitService = async () => {
  const db = await getDatabase();

  const getMessageLimits = async (userId: string): Promise<MessageLimit> => {
    try {
      let user = await db.getUser(userId);
      if (!user) {
        // Create user if they don't exist
        user = await db.createUser(userId);
      }

      return {
        dailyMessagesUsed: user.dailyMessagesUsed,
        dailyMessageLimit: user.dailyMessageLimit,
        extraMessages: user.extraMessages,
      };
    } catch (error) {
      logger.error('Failed to get message limits', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  };

  const incrementMessageCount = async (userId: string): Promise<boolean> => {
    try {
      return await db.incrementMessageCount(userId);
    } catch (error) {
      logger.error('Failed to increment message count', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  };

  const resetDailyMessageCount = async (): Promise<void> => {
    try {
      await db.resetDailyMessageCounts();
      logger.info('Daily message counts reset successfully');
    } catch (error) {
      logger.error('Failed to reset daily message counts', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  };

  const addExtraMessages = async (
    userId: string,
    count: number,
  ): Promise<void> => {
    try {
      const user = await db.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      await db.updateUser(userId, {
        extraMessages: user.extraMessages + count,
      });
      logger.info('Extra messages added successfully', {userId, count});
    } catch (error) {
      logger.error('Failed to add extra messages', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  };

  const updateUserPlan = async (
    userId: string,
    plan: string,
  ): Promise<void> => {
    try {
      const planLimits = PLAN_LIMITS[plan];
      if (!planLimits) {
        throw new Error(`Invalid plan: ${plan}`);
      }

      await db.updateUser(userId, {
        plan,
        dailyMessageLimit: planLimits.dailyMessageLimit,
      });
      logger.info('User plan updated successfully', {userId, plan});
    } catch (error) {
      logger.error('Failed to update user plan', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  };

  return {
    getMessageLimits,
    incrementMessageCount,
    resetDailyMessageCount,
    addExtraMessages,
    updateUserPlan,
  };
};
