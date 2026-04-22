import {Request, Response} from 'express';
import {Database} from '../../db/types';
import logger from '../../utils/logger';


export const getUserMessageHistory = async (
  req: Request,
  res: Response,
  db: Database,
) => {
  try {
    const {userId} = req.params;
    const {startDate, endDate} = req.query;

    // First check if user exists
    const user = await db.getUser(userId);
    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }

    // Get messages with their embedded cost data
    const messages = await db.all(
      `SELECT m.*,
              COALESCE(m.model, '') as model,
              COALESCE(m.promptTokens, 0) as promptTokens,
              COALESCE(m.completionTokens, 0) as completionTokens,
              COALESCE(m.totalTokens, 0) as totalTokens,
              COALESCE(m.inputCost, 0) as inputCost,
              COALESCE(m.outputCost, 0) as outputCost,
              COALESCE(m.totalCost, 0) as totalCost,
              COALESCE(m.costTimestamp, '') as costTimestamp
       FROM messages m
       WHERE m.userId = ?
       ${startDate ? 'AND m.timestamp >= ?' : ''}
       ${endDate ? 'AND m.timestamp <= ?' : ''}
       ORDER BY m.timestamp DESC`,
      [
        userId,
        ...(startDate ? [startDate] : []),
        ...(endDate ? [endDate] : []),
      ],
    );

    // Get user cost totals from user-level tracking
    const userCosts = await db.getUserCosts(userId);

    // Calculate message stats
    const userMessages = messages.filter(
      (m: {role: string}) => m.role === 'user',
    ).length;
    const assistantMessages = messages.filter(
      (m: {role: string}) => m.role === 'assistant',
    ).length;
    const systemMessages = messages.filter(
      (m: {role: string}) => m.role === 'system',
    ).length;

    // Group messages by matchId for stats
    const matchStats = messages.reduce((acc: Record<string, any>, msg: any) => {
      const matchId = msg.matchId || 'no-match';
      if (!acc[matchId]) {
        acc[matchId] = {
          matchId,
          messageCount: 0,
          userMessages: 0,
          assistantMessages: 0,
          systemMessages: 0,
        };
      }
      acc[matchId].messageCount++;
      acc[matchId][`${msg.role}Messages`]++;
      return acc;
    }, {});

    logger.info('Fetched message history for user:', {
      userId,
      messageCount: messages.length,
      userMessages,
      assistantMessages,
      systemMessages,
      userTotalCost: userCosts.totalCost,
      userTotalTokens: userCosts.totalTokens,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        dailyMessagesUsed: user.dailyMessagesUsed,
        extraMessages: user.extraMessages,
        lastResetDate: user.lastResetDate,
        installationId: user.installationId,
        totalCost: userCosts.totalCost,
        totalTokens: userCosts.totalTokens,
        lastCostUpdate: userCosts.lastCostUpdate,
      },
      usage: {
        totalMessages: userMessages,
        totalCost: userCosts.totalCost,
        totalTokens: userCosts.totalTokens,
        dailyUsage: [
          {
            date: new Date().toISOString().split('T')[0],
            messageCount: userMessages,
            userMessages,
            assistantMessages,
            systemMessages,
          },
        ],
        matchStats: Object.values(matchStats),
      },
      messages,
      costs: userCosts,
    });
  } catch (error) {
    logger.error('Error fetching user message history:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.params.userId,
    });
    res.status(500).json({error: 'Failed to fetch user message history'});
  }
};

export const getMessageCosts = async (
  req: Request,
  res: Response,
  db: Database,
) => {
  try {
    const {userId} = req.params;
    const {startDate, endDate} = req.query;

    // First check if user exists
    const user = await db.getUser(userId);
    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }

    // Get detailed cost breakdown
    const costs = await db.getMessageCosts(
      userId,
      startDate as string,
      endDate as string,
    );

    // Get total costs
    const totals = await db.getTotalCosts(
      userId,
      startDate as string,
      endDate as string,
    );

    logger.info('Fetched message costs for user:', {
      userId,
      costCount: costs.length,
      totalCost: totals.totalCost,
      totalTokens: totals.totalTokens,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
      },
      costs,
      totals,
    });
  } catch (error) {
    logger.error('Error fetching message costs:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.params.userId,
    });
    res.status(500).json({error: 'Failed to fetch message costs'});
  }
};

export const getUserInfo = async (
  req: Request,
  res: Response,
  db: Database,
) => {
  try {
    const {userId} = req.params;
    const {startDate, endDate} = req.query;

    // First check if user exists
    const user = await db.getUser(userId);
    if (!user) {
      logger.warning('User not found:', {userId});
      return res.status(404).json({error: 'User not found', userId});
    }

    logger.info('Fetching user info:', {userId, startDate, endDate});

    // Get messages with their embedded cost data
    const messages = await db.all(
      `SELECT
        m.id, m.userId, m.matchId, m.role, m.content, m.timestamp,
        COALESCE(m.model, '') as model,
        COALESCE(m.promptTokens, 0) as promptTokens,
        COALESCE(m.completionTokens, 0) as completionTokens,
        COALESCE(m.totalTokens, 0) as totalTokens,
        COALESCE(m.inputCost, 0) as inputCost,
        COALESCE(m.outputCost, 0) as outputCost,
        COALESCE(m.totalCost, 0) as totalCost,
        COALESCE(m.costTimestamp, '') as costTimestamp
       FROM messages m
       WHERE m.userId = ?
       ${startDate ? 'AND m.timestamp >= ?' : ''}
       ${endDate ? 'AND m.timestamp <= ?' : ''}
       ORDER BY m.timestamp DESC`,
      [
        userId,
        ...(startDate ? [startDate] : []),
        ...(endDate ? [endDate] : []),
      ],
    );

    logger.info('Raw messages from database:', {
      messages: messages.map((msg: any) => ({
        id: msg.id,
        timestamp: msg.timestamp,
        role: msg.role,
        model: msg.model,
        totalCost: msg.totalCost,
      })),
    });

    // Calculate total message counts
    const totalUserMessages = messages.filter(
      (m: {role: string}) => m.role === 'user',
    ).length;
    const totalAssistantMessages = messages.filter(
      (m: {role: string}) => m.role === 'assistant',
    ).length;
    const totalSystemMessages = messages.filter(
      (m: {role: string}) => m.role === 'system',
    ).length;

    // Get match stats
    const matchStats = await db.all(
      `SELECT
        matchId,
        COUNT(*) as messageCount,
        SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as userMessages,
        SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) as assistantMessages,
        SUM(CASE WHEN role = 'system' THEN 1 ELSE 0 END) as systemMessages
       FROM messages
       WHERE userId = ?
       GROUP BY matchId
       ORDER BY messageCount DESC`,
      [userId],
    );

    // Calculate daily message usage
    const dailyUsage = await db.all(
      `SELECT
         date(timestamp) as date,
         COUNT(*) as messageCount,
         SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as userMessages,
         SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) as assistantMessages,
         SUM(CASE WHEN role = 'system' THEN 1 ELSE 0 END) as systemMessages
       FROM messages
       WHERE userId = ?
       GROUP BY date(timestamp)
       ORDER BY date DESC`,
      [userId],
    );

    // Get user cost totals from user-level tracking
    const userCosts = await db.getUserCosts(userId);

    // Also calculate costs from embedded message data for comparison
    const [embeddedCosts] = await db.all(
      `SELECT
         COALESCE(SUM(m.totalCost), 0) as totalCost,
         COALESCE(SUM(m.totalTokens), 0) as totalTokens,
         COUNT(DISTINCT CASE WHEN m.totalCost > 0 THEN m.id END) as messageCount
       FROM messages m
       WHERE m.userId = ?
       ${startDate ? 'AND m.timestamp >= ?' : ''}
       ${endDate ? 'AND m.timestamp <= ?' : ''}`,
      [
        userId,
        ...(startDate ? [startDate] : []),
        ...(endDate ? [endDate] : []),
      ],
    );

    logger.info('Cost data from database:', {
      userCosts,
      embeddedCosts,
    });

    logger.info('Fetched comprehensive user info:', {
      userId,
      messageCount: messages.length,
      userMessages: totalUserMessages,
      assistantMessages: totalAssistantMessages,
      systemMessages: totalSystemMessages,
      matchCount: matchStats.length,
      userTotalCost: userCosts.totalCost,
      userTotalTokens: userCosts.totalTokens,
      embeddedTotalCost: embeddedCosts?.totalCost || 0,
      embeddedTotalTokens: embeddedCosts?.totalTokens || 0,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        dailyMessagesUsed: user.dailyMessagesUsed,
        extraMessages: user.extraMessages,
        lastResetDate: user.lastResetDate,
        installationId: user.installationId,
      },
      usage: {
        totalMessages: messages.length,
        userMessages: totalUserMessages,
        assistantMessages: totalAssistantMessages,
        systemMessages: totalSystemMessages,
        totalCost: userCosts.totalCost,
        totalTokens: userCosts.totalTokens,
        dailyUsage,
        matchStats,
      },
      messages: messages.map((msg: any) => ({
        id: msg.id,
        userId: msg.userId,
        matchId: msg.matchId,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        model: msg.model || '',
        promptTokens: msg.promptTokens || 0,
        completionTokens: msg.completionTokens || 0,
        totalTokens: msg.totalTokens || 0,
        inputCost: msg.inputCost || 0,
        outputCost: msg.outputCost || 0,
        totalCost: msg.totalCost || 0,
      })),
      costs: userCosts,
    });
  } catch (error) {
    logger.error('Error fetching user info:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.params.userId,
    });
    res.status(500).json({
      error: 'Failed to fetch user info',
      details: error instanceof Error ? error.message : 'Unknown error',
      userId: req.params.userId,
    });
  }
};
