import {GenerateReplyRequest, GenerateReplyResponse} from '../types';
import {appendConversation, loadConversation} from '../utils/conversationUtils';

export const createSandboxService = () => {
  const mockResponses = [
    {
      id: 'chatcmpl-mock-1',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-4-vision-preview',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: `<summary>
Based on the conversation history, this match seems to enjoy outdoor activities and has a playful sense of humor. They've responded positively to light-hearted messages and seem interested in getting to know each other better.
</summary>
<message>
That hiking photo looks amazing! I bet you have some great stories from the trail. What's the most unexpected thing you've encountered on a hike?
</message>`,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    },
    {
      id: 'chatcmpl-mock-2',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-4-vision-preview',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: `<summary>
The match has shown interest in travel and food. They've shared photos from different locations and seem to enjoy trying new cuisines. Previous messages have been casual and friendly.
</summary>
<message>
That pasta dish looks incredible! I'm always on the hunt for new Italian spots. Any other hidden gems you'd recommend in the city?
</message>`,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    },
    {
      id: 'chatcmpl-mock-3',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-4-vision-preview',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: `<summary>
The match has a creative side and enjoys photography. They've shared several artistic shots and seem to appreciate thoughtful comments about their work.
</summary>
<message>
The lighting in that photo is stunning! You've got a great eye for composition. Do you shoot with a specific camera or mostly use your phone?
</message>`,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    },
  ];

  const generateReply = async (
    request: GenerateReplyRequest,
  ): Promise<GenerateReplyResponse> => {
    try {
      // Create a truncated version of the request for logging and processing
      const truncatedRequest = {
        ...request,
        images: request.images.map(img => {
          // Remove the data:image/jpeg;base64, prefix if present
          const base64Data = img.includes('base64,')
            ? img.split('base64,')[1]
            : img;
          // Truncate to first 20 characters of the actual base64 data
          return `data:image/jpeg;base64,${base64Data.substring(0, 20)}...`;
        }),
      };

      console.log(
        `[${new Date().toISOString()}] [Sandbox] Processing request:`,
        JSON.stringify(truncatedRequest, null, 2),
      );

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

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      const mockResponse =
        mockResponses[Math.floor(Math.random() * mockResponses.length)];

      console.log(
        `[${new Date().toISOString()}] [Sandbox] Generated mock response:`,
        JSON.stringify(mockResponse, null, 2),
      );

      // Parse the response to extract summary and message
      const responseContent = mockResponse.choices[0].message.content;
      const summaryMatch = responseContent.match(/<summary>(.*?)<\/summary>/s);
      const messageMatch = responseContent.match(/<message>(.*?)<\/message>/s);

      if (!messageMatch) {
        throw new Error('Invalid response format from mock service');
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

      const response = {reply};
      console.log(
        `[${new Date().toISOString()}] [Sandbox] Final response:`,
        JSON.stringify(response, null, 2),
      );

      return response;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [Sandbox] Error:`, error);
      return {
        reply: '',
        error: 'Failed to generate mock reply',
      };
    }
  };

  return {
    generateReply,
  };
};
