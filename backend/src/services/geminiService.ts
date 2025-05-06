import {GoogleGenerativeAI} from '@google/generative-ai';
import {config} from '../config/config';
import {formatPromptWithContext} from '../config/prompts';
import {GenerateReplyRequest, GenerateReplyResponse} from '../types';
import {appendConversation} from '../utils/conversationUtils';
import {calculateCost} from '../utils/costUtils';
import logger from '../utils/logger';
import {createSandboxService} from './sandboxService';

export const createGeminiService = () => {
  if (!config.gemini.apiKey && !config.gemini.sandboxMode) {
    throw new Error('GEMINI_API_KEY is required when not in sandbox mode');
  }

  const genAI =
    config.gemini.sandboxMode || !config.gemini.apiKey
      ? null
      : new GoogleGenerativeAI(config.gemini.apiKey);

  const model = genAI?.getGenerativeModel({model: config.gemini.model});
  const sandboxService = createSandboxService();

  const generateReply = async (
    request: GenerateReplyRequest,
  ): Promise<GenerateReplyResponse> => {
    // Use sandbox service if in sandbox mode or if Gemini client is not initialized
    if (config.gemini.sandboxMode || !model) {
      return sandboxService.generateReply(request);
    }

    try {
      const prompt = formatPromptWithContext(request.prompt);

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Log the full result structure for debugging
      logger.debug('Gemini API response structure', {
        result: JSON.stringify(result, null, 2),
        response: JSON.stringify(response, null, 2),
      });

      // For now, we'll log a placeholder usage since we can't reliably get token counts
      const usage = {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      };

      const costBreakdown = calculateCost(config.gemini.model, usage);
      logger.info('Gemini API usage and cost', {
        model: config.gemini.model,
        usage,
        cost: {
          input: costBreakdown.inputCost.toFixed(6),
          output: costBreakdown.outputCost.toFixed(6),
          total: costBreakdown.totalCost.toFixed(6),
        },
        note: 'Token counts not available in current Gemini API version',
      });

      // Parse the response to extract summary and message
      const summaryMatch = text.match(/<summary>(.*?)<\/summary>/s);
      const messageMatch = text.match(/<message>(.*?)<\/message>/s);

      if (!messageMatch) {
        throw new Error('Invalid response format from Gemini');
      }

      const summary = summaryMatch ? summaryMatch[1].trim() : '';
      const reply = messageMatch[1].trim();

      // Save both the summary and the message
      if (!request.deleteAfterResponse) {
        await appendConversation(
          request.userId,
          request.matchId,
          summary,
          reply,
        );
      }

      return {reply, summary};
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [Gemini] Error:`, error);
      return {
        reply: '',
        error: 'Failed to generate reply',
      };
    }
  };

  return {
    generateReply,
  };
};
