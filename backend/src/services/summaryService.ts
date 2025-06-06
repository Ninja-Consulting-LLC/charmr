import {Database} from '../db/types';
import {MessageMode, MessageRole} from '../types/enums';
import logger from '../utils/logger';
import {createOpenAIService} from './openaiService';

export const createSummaryService = (db: Database) => {
  const openaiService = createOpenAIService();

  const updateMatchSummary = async (
    userId: string,
    matchId: string,
    currentSummary: string | undefined,
    latestMessages: {content: string; role: MessageRole}[],
  ): Promise<{updated: boolean; summary?: string}> => {
    try {
      // If no messages to analyze, return unchanged
      if (latestMessages.length === 0) {
        return {updated: false};
      }

      // Prepare the prompt for GPT
      const prompt = `Update this summary if anything meaningful has changed in the dynamic. If no update is needed, return a signal like {updated: false} without repeating the summary.

Current summary:
${currentSummary || 'No summary yet'}

Latest message exchange:
${latestMessages
  .map(
    msg =>
      `${msg.role === MessageRole.USER ? 'User' : 'Match'}: ${msg.content}`,
  )
  .join('\n')}

Respond in this JSON format:
{
  "updated": boolean,
  "summary": "Updated summary if meaningful changes occurred"
}`;

      // Call GPT to analyze and potentially update the summary
      const response = await openaiService.generateReply({
        prompt,
        images: [],
        userId,
        matchId,
        mode: MessageMode.GENERATE,
      });

      try {
        const result = JSON.parse(response.reply);
        if (result.updated && result.summary) {
          // Update the match with the new summary
          const now = new Date().toISOString();
          await db.updateMatch(userId, matchId, {
            summary: result.summary,
            summaryLastUpdated: now,
          });
          return {updated: true, summary: result.summary};
        }
        return {updated: false};
      } catch (error) {
        logger.error('Failed to parse summary update response', {
          error: error instanceof Error ? error.message : 'Unknown error',
          response: response.reply,
        });
        return {updated: false};
      }
    } catch (error) {
      logger.error('Failed to update match summary', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        matchId,
      });
      return {updated: false};
    }
  };

  const getMatchSummary = async (
    userId: string,
    matchId: string,
  ): Promise<string | undefined> => {
    try {
      const match = await db.getMatchById(userId, matchId);
      return match?.summary;
    } catch (error) {
      logger.error('Failed to get match summary', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        matchId,
      });
      return undefined;
    }
  };

  return {
    updateMatchSummary,
    getMatchSummary,
  };
};
