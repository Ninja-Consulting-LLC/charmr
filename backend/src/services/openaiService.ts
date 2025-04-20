import OpenAI from 'openai';
import {config} from '../config/config';
import {GenerateReplyRequest, GenerateReplyResponse} from '../types';
import {appendConversation, loadConversation} from '../utils/conversationUtils';
import {createSandboxService} from './sandboxService';

export const createOpenAIService = () => {
  const openai = config.openai.sandboxMode
    ? null
    : new OpenAI({apiKey: config.openai.apiKey});
  const sandboxService = createSandboxService();

  const generateReply = async (
    request: GenerateReplyRequest,
  ): Promise<GenerateReplyResponse> => {
    // Use sandbox service if in sandbox mode or if OpenAI client is not initialized
    if (config.openai.sandboxMode || !openai) {
      return sandboxService.generateReply(request);
    }

    try {
      // Load conversation history
      const conversationHistory = await loadConversation(
        request.userId,
        request.matchId,
      );
      const recentMessages = conversationHistory.slice(-5); // Get last 5 messages

      // Extract assistant messages and format them with context
      const previousAssistantMessages = recentMessages
        .filter(msg => msg.role === 'assistant')
        .map(msg => msg.content)
        .join('\n');

      const contextMessage = previousAssistantMessages
        ? `Here are the previous messages we sent to this person for context in generating your response:\n${previousAssistantMessages}`
        : '';

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `You are a helpful dating assistant. Your task is to help users craft engaging and appropriate responses to their matches. Consider the conversation history and context when generating responses.

${contextMessage}

Format your response as follows:
<summary>
A brief summary of the match's interests and conversation style based on the history
</summary>
<message>
Your suggested reply to the match
</message>`,
        },
        {
          role: 'user',
          content: [
            {type: 'text', text: request.prompt},
            ...(request.images.map(image => ({
              type: 'image_url',
              image_url: {url: image},
            })) as OpenAI.Chat.ChatCompletionContentPartImage[]),
          ],
        },
      ];

      console.log(
        `[${new Date().toISOString()}] [OpenAI] Sending request to ChatGPT:`,
        JSON.stringify(messages, null, 2),
      );

      const response = await openai.chat.completions.create({
        model: config.openai.model,
        messages,
        max_tokens: 150,
      });

      console.log(
        `[${new Date().toISOString()}] [OpenAI] Received response from ChatGPT:`,
        JSON.stringify(response, null, 2),
      );

      // Parse the response to extract summary and message
      const responseContent = response.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('Empty response from ChatGPT');
      }

      const summaryMatch = responseContent.match(/<summary>(.*?)<\/summary>/s);
      const messageMatch = responseContent.match(/<message>(.*?)<\/message>/s);

      if (!messageMatch) {
        throw new Error('Invalid response format from ChatGPT');
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

      const finalResponse = {reply};
      console.log(
        `[${new Date().toISOString()}] [OpenAI] Final response:`,
        JSON.stringify(finalResponse, null, 2),
      );

      return finalResponse;
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
