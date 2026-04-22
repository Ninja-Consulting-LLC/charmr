import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {resetMessageCounts} from '../cron/resetMessageCounts';
import {Database} from '../db/types';
import * as messageLimitModule from '../services/messageLimitService';

jest.mock('../services/messageLimitService', () => ({
  createMessageLimitService: jest.fn(),
}));

describe('resetMessageCounts', () => {
  const createMessageLimitService =
    messageLimitModule.createMessageLimitService as jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    const resetDailyMessageCount = jest.fn() as jest.MockedFunction<any>;
    resetDailyMessageCount.mockResolvedValue(undefined);
    createMessageLimitService.mockReturnValue({resetDailyMessageCount});
  });

  it('invokes resetDailyMessageCount', async () => {
    const db = {} as Database;
    await resetMessageCounts(db);
    expect(createMessageLimitService).toHaveBeenCalledWith(db);
    const svc = createMessageLimitService.mock.results[0].value as {
      resetDailyMessageCount: jest.MockedFunction<any>;
    };
    expect(svc.resetDailyMessageCount).toHaveBeenCalled();
  });

  it('swallows errors from message limit service', async () => {
    const resetDailyMessageCount = jest.fn() as jest.MockedFunction<any>;
    resetDailyMessageCount.mockRejectedValue(new Error('reset failed'));
    createMessageLimitService.mockReturnValue({resetDailyMessageCount});
    await expect(resetMessageCounts({} as Database)).resolves.toBeUndefined();
  });
});
