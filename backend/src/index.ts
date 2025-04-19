import bodyParser from 'body-parser';
import cors from 'cors';
import express, {NextFunction, Request, Response} from 'express';
import rateLimit from 'express-rate-limit';
import OpenAI from 'openai';
import {appendConversation, loadConversation} from './utils/conversationUtils';

interface GenerateReplyRequest {
  prompt: string;
  images: string[];
  userId: string;
  matchId: string;
  deleteAfterResponse: boolean;
  skipRateLimiting?: boolean;
}

interface GenerateReplyResponse {
  reply: string;
  error?: string;
}

const app = express();
const port = 3001;

// Log all environment variables
try {
  console.log('\n=== Environment Variables ===');
  const envVars = Object.keys(process.env).sort();
  envVars.forEach(key => {
    // Skip sensitive values
    if (
      key.toLowerCase().includes('key') ||
      key.toLowerCase().includes('secret')
    ) {
      console.log(`${key}: [REDACTED]`);
    } else {
      console.log(`${key}: ${process.env[key]}`);
    }
  });
  console.log('==========================\n');
} catch (error) {
  console.error('Error logging environment variables:', error);
}

// Helper function to format retry time
function formatRetryAfter(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Mock responses for sandbox mode
export const mockResponses = [
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

// Initialize OpenAI client
let openai: OpenAI | null = null;
if (process.env.OPENAI_SANDBOX_MODE !== 'true' && process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Rate limiters
const isDevelopment = process.env.NODE_ENV === 'development';
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('isDevelopment:', isDevelopment);

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each user to 100 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => {
    console.log('Checking if should skip rate limit:', isDevelopment);
    return isDevelopment;
  },
  keyGenerator: req => {
    // Use userId if available, otherwise fallback to IP
    const key = req.body.userId || req.ip;
    console.log('Rate limit key:', key);
    return key;
  },
  handler: (req, res) => {
    console.log('Rate limit exceeded for key:', req.body.userId || req.ip);
    const retryAfter = Number(res.getHeader('Retry-After') || 900); // Default to 15 minutes if not set
    res.status(429).json({
      error: `Please try again in ${formatRetryAfter(retryAfter)}`,
      retryAfter,
    });
  },
});

const generateReplyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each user to 5 requests per hour
  message: 'Too many message generation requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => {
    // Only skip rate limiting if explicitly requested via skipRateLimiting flag
    // This allows testing rate limiting even in development mode
    const shouldSkip = req.body.skipRateLimiting === true;
    console.log('Checking if should skip rate limit:', shouldSkip, {
      skipRateLimiting: req.body.skipRateLimiting,
      isDevelopment,
    });
    return shouldSkip;
  },
  keyGenerator: req => {
    // Use userId if available, otherwise fallback to IP
    const key = req.body.userId || req.ip;
    console.log('Generate reply rate limit key:', key);
    return key;
  },
  handler: (req, res) => {
    console.log(
      'Generate reply rate limit exceeded for key:',
      req.body.userId || req.ip,
    );
    const retryAfter = Number(res.getHeader('Retry-After') || 3600); // Default to 1 hour if not set
    res.status(429).json({
      error: `Please try again in ${formatRetryAfter(retryAfter)}`,
      retryAfter,
    });
  },
});

// Middleware
app.use(cors());
app.use(bodyParser.json({limit: '50mb'}));
app.use(generalLimiter); // Apply general rate limiting to all routes

// Logger middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// POST endpoint
app.post(
  '/api/generate-reply',
  generateReplyLimiter, // Apply stricter rate limiting to this endpoint
  async (
    req: Request<{}, {}, GenerateReplyRequest>,
    res: Response<GenerateReplyResponse>,
  ) => {
    try {
      const {prompt, images, userId, matchId} = req.body;

      // Log the full request context
      console.log('\n=== Generate Reply Request ===');
      console.log('Request Body:', {
        prompt,
        userId,
        matchId,
        imageCount: images?.length || 0,
        skipRateLimiting: req.body.skipRateLimiting,
      });
      console.log('==========================\n');

      if (!images || images.length === 0) {
        throw new Error('No images provided');
      }

      // Check if we're in sandbox mode
      if (process.env.OPENAI_SANDBOX_MODE === 'true' || !openai) {
        console.log('Running in sandbox mode - using mock response');

        // Load conversation history
        const conversationHistory = await loadConversation(userId, matchId);
        const recentMessages = conversationHistory.slice(-5); // Get last 5 messages

        // Extract assistant messages and format them with context
        const previousAssistantMessages = recentMessages
          .filter(msg => msg.role === 'assistant')
          .map(msg => msg.content)
          .join('\n');

        const contextMessage = previousAssistantMessages
          ? `Here are the previous messages we sent to this person for context in generating your response:\n${previousAssistantMessages}`
          : '';

        // Use the first image
        const imageBase64 = images[0];

        // Prepare messages array with conversation history
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
          {
            role: 'system',
            content: `You are an expert dating assistant that helps craft engaging, natural, and contextually appropriate messages for dating apps. Your goal is to help users create messages that:

1. Match the tone and style of the conversation history
2. Are authentic and feel natural, not overly scripted
3. Show genuine interest in the other person
4. Include specific references to their profile or photos when relevant
5. Maintain appropriate boundaries and respect
6. Are concise and engaging (1-2 sentences typically)
7. End with a question or clear next step when appropriate
8. Follow the user's specific instructions (e.g., "make it flirty", "make it funny", etc.)

Remember to:
- Keep messages light and fun
- Avoid being too forward or suggestive unless specifically requested
- Match the energy level of the previous conversation
- Use the provided photos to make relevant, specific comments
- Maintain a natural, conversational tone
- Always respect and follow the user's specific prompt while maintaining appropriate boundaries
- If the user asks for a specific tone (flirty, funny, etc.), prioritize that tone while keeping the message natural and appropriate

Your response must be in the following format:
<summary>
[Provide a brief summary of the conversation context and what you've learned about the match]
</summary>
<message>
[The actual message to send to the match]
</message>`,
          },
          ...(contextMessage
            ? [
                {
                  role: 'system' as const,
                  content: contextMessage,
                },
              ]
            : []),
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ];

        console.log('\n=== ChatGPT Payload (Sandbox Mode) ===');
        console.log('Model: gpt-4-vision-preview');
        console.log(
          'Full Payload Structure:',
          JSON.stringify(
            {
              model: 'gpt-4-vision-preview',
              messages: messages.map(msg => {
                // For system messages, show the full content
                if (msg.role === 'system') {
                  return {
                    role: msg.role,
                    content: msg.content,
                  };
                }
                // For user messages, just show the structure without content
                if (msg.role === 'user') {
                  return {
                    role: msg.role,
                    content: '[USER MESSAGE WITH IMAGE]',
                  };
                }
                return msg;
              }),
            },
            null,
            2,
          ),
        );
        console.log('==========================\n');

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        const mockResponse =
          mockResponses[Math.floor(Math.random() * mockResponses.length)];

        console.log('\n=== Mock ChatGPT Response ===');
        console.log('Full Response:', mockResponse.choices[0].message.content);
        console.log('==========================\n');

        // Parse the response to extract summary and message
        const responseContent = mockResponse.choices[0].message.content;
        const summaryMatch = responseContent.match(
          /<summary>(.*?)<\/summary>/s,
        );
        const messageMatch = responseContent.match(
          /<message>(.*?)<\/message>/s,
        );

        if (!messageMatch) {
          throw new Error('Invalid response format from ChatGPT');
        }

        const summary = summaryMatch ? summaryMatch[1].trim() : '';
        const reply = messageMatch[1].trim();

        // Save both the summary and the message
        await appendConversation(userId, matchId, summary, reply);

        // Only send the message part to the frontend
        return res.json({reply});
      }

      // Load conversation history
      const conversationHistory = await loadConversation(userId, matchId);
      const recentMessages = conversationHistory.slice(-5); // Get last 5 messages

      // Extract assistant messages and format them with context
      const previousAssistantMessages = recentMessages
        .filter(msg => msg.role === 'assistant')
        .map(msg => msg.content)
        .join('\n');

      const contextMessage = previousAssistantMessages
        ? `Here are the previous messages we sent to this person for context in generating your response:\n${previousAssistantMessages}`
        : '';

      // Use the first image
      const imageBase64 = images[0];

      // Prepare messages array with conversation history
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `You are an expert dating assistant that helps craft engaging, natural, and contextually appropriate messages for dating apps. Your goal is to help users create messages that:

1. Match the tone and style of the conversation history
2. Are authentic and feel natural, not overly scripted
3. Show genuine interest in the other person
4. Include specific references to their profile or photos when relevant
5. Maintain appropriate boundaries and respect
6. Are concise and engaging (1-2 sentences typically)
7. End with a question or clear next step when appropriate
8. Follow the user's specific instructions (e.g., "make it flirty", "make it funny", etc.)

Remember to:
- Keep messages light and fun
- Avoid being too forward or suggestive unless specifically requested
- Match the energy level of the previous conversation
- Use the provided photos to make relevant, specific comments
- Maintain a natural, conversational tone
- Always respect and follow the user's specific prompt while maintaining appropriate boundaries
- If the user asks for a specific tone (flirty, funny, etc.), prioritize that tone while keeping the message natural and appropriate

Your response must be in the following format:
<summary>
[Provide a brief summary of the conversation context and what you've learned about the match]
</summary>
<message>
[The actual message to send to the match]
</message>`,
        },
        ...(contextMessage
          ? [
              {
                role: 'system' as const,
                content: contextMessage,
              },
            ]
          : []),
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ];

      const response = await openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages,
      });

      // Parse the response to extract summary and message
      const responseContent = response.choices[0].message.content;
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
      await appendConversation(userId, matchId, summary, reply);

      // Only send the message part to the frontend
      res.json({reply});
    } catch (error) {
      console.error('Error generating reply:', error);
      res.status(500).json({reply: '', error: 'Failed to generate reply'});
    }
  },
);

// Start server
try {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(
      `Sandbox mode: ${
        process.env.OPENAI_SANDBOX_MODE === 'true' ? 'enabled' : 'disabled'
      }`,
    );
  });
} catch (error) {
  console.error('Error starting server:', error);
  process.exit(1);
}
