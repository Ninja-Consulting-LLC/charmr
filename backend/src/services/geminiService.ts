import {GoogleGenerativeAI} from '@google/generative-ai';
import {config} from '../config/config';
import {formatPromptWithContext} from '../config/prompts';
import {GenerateReplyRequest, GenerateReplyResponse} from '../types';
import {appendConversation} from '../utils/conversationUtils';

export const createGeminiService = () => {
  if (!config.gemini.apiKey) {
    throw new Error('GEMINI_API_KEY is required');
  }

  const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  const model = genAI.getGenerativeModel({model: config.gemini.model});

  const generateReply = async (
    request: GenerateReplyRequest,
  ): Promise<GenerateReplyResponse> => {
    try {
      const prompt = formatPromptWithContext(request.prompt);

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

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
