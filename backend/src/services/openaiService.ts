import OpenAI from 'openai';
import {config} from '../config/config';
import {formatPromptWithContext} from '../config/prompts';
import {GenerateReplyRequest, GenerateReplyResponse} from '../types';
import {appendConversation} from '../utils/conversationUtils';

export const createOpenAIService = () => {
  if (!config.openai.apiKey) {
    throw new Error('OPENAI_API_KEY is required');
  }

  const openai = new OpenAI({
    apiKey: config.openai.apiKey,
  });

  const generateReply = async (
    request: GenerateReplyRequest,
  ): Promise<GenerateReplyResponse> => {
    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: formatPromptWithContext(request.prompt),
        },
      ];

      if (request.images?.length) {
        messages[0] = {
          role: 'system',
          content: [
            {type: 'text', text: formatPromptWithContext(request.prompt)},
            ...request.images.map(img => ({
              type: 'image_url' as const,
              image_url: {url: img, detail: 'auto' as const},
            })),
          ] as OpenAI.Chat.ChatCompletionContentPart[],
        } as OpenAI.Chat.ChatCompletionMessageParam;
      }

      const response = await openai.chat.completions.create({
        model: config.openai.model,
        messages,
        max_tokens: config.openai.maxTokens,
        temperature: config.openai.temperature,
      });

      const text = response.choices[0]?.message?.content || '';
      if (!text) {
        throw new Error('No response from OpenAI');
      }

      // Parse the response to extract summary and message
      const summaryMatch = text.match(/<summary>(.*?)<\/summary>/s);
      const messageMatch = text.match(/<message>(.*?)<\/message>/s);

      if (!messageMatch) {
        throw new Error('Invalid response format from OpenAI');
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

      return {
        reply,
        summary,
        usage: response.usage,
      };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [OpenAI] Error:`, error);
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
