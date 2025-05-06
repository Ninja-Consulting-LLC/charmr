import OpenAI from 'openai';
import {config} from '../config/config';
import {formatPromptWithContext} from '../config/prompts';
import {GenerateReplyRequest, GenerateReplyResponse} from '../types';
import {appendConversation} from '../utils/conversationUtils';
import {createSandboxService} from './sandboxService';

export const createOpenAIService = () => {
  if (!config.openai.apiKey && !config.openai.sandboxMode) {
    throw new Error('OPENAI_API_KEY is required when not in sandbox mode');
  }

  const openai = config.openai.sandboxMode
    ? null
    : new OpenAI({
        apiKey: config.openai.apiKey,
      });

  const sandboxService = createSandboxService();

  const generateReply = async (
    request: GenerateReplyRequest,
  ): Promise<GenerateReplyResponse> => {
    // Use sandbox service if in sandbox mode or if OpenAI client is not initialized
    if (config.openai.sandboxMode || !openai) {
      return sandboxService.generateReply(request);
    }

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
