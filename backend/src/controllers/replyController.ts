import {Request, Response} from 'express';
import {createOpenAIService} from '../services/openaiService';
import {GenerateReplyRequest} from '../types';
import {loadConversation} from '../utils/conversationUtils';

export const createReplyController = () => {
  const openaiService = createOpenAIService();

  const generateReply = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: GenerateReplyRequest = req.body;
      console.log(
        `[${new Date().toISOString()}] [Controller] Processing request:`,
        {
          ...request,
          images: request.images.map(img => {
            // Remove the data:image/jpeg;base64, prefix if present
            const base64Data = img.includes('base64,')
              ? img.split('base64,')[1]
              : img;
            // Truncate to first 20 characters of the actual base64 data
            return `data:image/jpeg;base64,${base64Data.substring(0, 20)}...`;
          }),
        },
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

      // Generate reply using OpenAI service
      const response = await openaiService.generateReply(request);

      if (response.error) {
        console.log(
          `[${new Date().toISOString()}] [Controller] Error response:`,
          response,
        );
        res.status(500).json(response);
        return;
      }

      console.log(
        `[${new Date().toISOString()}] [Controller] Success response:`,
        response,
      );
      res.json(response);
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] [Controller] Error in generateReply:`,
        error,
      );
      res.status(500).json({
        error: 'Failed to generate reply',
      });
    }
  };

  return {
    generateReply,
  };
};
