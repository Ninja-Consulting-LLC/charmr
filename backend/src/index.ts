import bodyParser from 'body-parser';
import cors from 'cors';
import express, {NextFunction, Request, Response} from 'express';
import OpenAI from 'openai';

interface GenerateReplyRequest {
  prompt: string;
  images: string[];
  userId: string;
  style: string;
  deleteAfterResponse: boolean;
}

interface GenerateReplyResponse {
  reply: string;
}

const app = express();
const port = 3001;

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
          content: "Here's a fun and confident message you can send.",
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
          content: 'Try this engaging and witty response!',
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
          content: 'This message will definitely catch their attention!',
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
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors());
app.use(bodyParser.json({limit: '50mb'}));

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
  async (
    req: Request<{}, {}, GenerateReplyRequest>,
    res: Response<GenerateReplyResponse>,
  ) => {
    try {
      const {prompt, images, userId, style} = req.body;

      if (!images || images.length === 0) {
        throw new Error('No images provided');
      }

      // Check if we're in sandbox mode
      if (process.env.OPENAI_SANDBOX_MODE === 'true') {
        console.log('Running in sandbox mode - using mock response');
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        const mockResponse =
          mockResponses[Math.floor(Math.random() * mockResponses.length)];
        return res.json({reply: mockResponse.choices[0].message.content});
      }

      // Combine style and prompt
      const fullPrompt = `${prompt} (${style} style)`;

      // Use the first image
      const imageBase64 = images[0];

      const response = await openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: fullPrompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 300,
      });

      const reply = response.choices[0]?.message?.content || '';

      res.json({reply});
    } catch (error) {
      console.error('Error generating reply:', error);
      res.status(500).json({
        reply:
          'Sorry, I encountered an error while generating your reply. Please try again.',
      });
    }
  },
);

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(
    `Sandbox mode: ${
      process.env.OPENAI_SANDBOX_MODE === 'true' ? 'enabled' : 'disabled'
    }`,
  );
});
