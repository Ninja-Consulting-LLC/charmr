import bodyParser from 'body-parser';
import cors from 'cors';
import express, {NextFunction, Request, Response} from 'express';
import rateLimit from 'express-rate-limit';
import OpenAI from 'openai';

interface GenerateReplyRequest {
  prompt: string;
  images: string[];
  userId: string;
  style: string;
  deleteAfterResponse: boolean;
  skipRateLimiting?: boolean;
}

interface GenerateReplyResponse {
  reply: string;
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
  max: 5, // Limit each device to 5 requests per hour
  message: 'Too many message generation requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => {
    // Only skip rate limiting if explicitly requested via skipRateLimiting flag
    const shouldSkip = req.body.skipRateLimiting === true;
    console.log('Rate limit check for device:', req.body.userId, {
      shouldSkip,
      skipRateLimiting: req.body.skipRateLimiting,
      isDevelopment,
    });
    return shouldSkip;
  },
  keyGenerator: req => {
    // Use device ID for rate limiting
    const deviceId = req.body.userId;
    console.log('Rate limit key (Device ID):', deviceId);
    return deviceId || req.ip; // Fallback to IP if no device ID
  },
  handler: (req, res) => {
    console.log('Rate limit exceeded for device:', req.body.userId);
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
      const {prompt, images, userId, style} = req.body;

      if (!images || images.length === 0) {
        throw new Error('No images provided');
      }

      // Check if we're in sandbox mode
      if (process.env.OPENAI_SANDBOX_MODE === 'true' || !openai) {
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
