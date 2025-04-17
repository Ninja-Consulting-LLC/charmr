import bodyParser from 'body-parser';
import cors from 'cors';
import express, {NextFunction, Request, Response} from 'express';

interface GenerateReplyRequest {
  prompt: string;
  images: string[];
  userId: string;
}

interface GenerateReplyResponse {
  reply: string;
}

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json({limit: '50mb'})); // Increased limit for base64 images

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

// Mock responses
const mockResponses: string[] = [
  "Here's a fun and confident message you can send.",
  'Try this engaging and witty response!',
  'This message will definitely catch their attention!',
  'A perfect blend of charm and personality in this reply.',
  'This response shows your fun and interesting side!',
];

// POST endpoint
app.post(
  '/api/generate-reply',
  (
    req: Request<{}, {}, GenerateReplyRequest>,
    res: Response<GenerateReplyResponse>,
  ) => {
    const {prompt, images, userId} = req.body;

    // Simulate processing delay
    setTimeout(() => {
      const randomResponse =
        mockResponses[Math.floor(Math.random() * mockResponses.length)];
      res.json({reply: randomResponse});
    }, 1500); // 1.5 second delay
  },
);

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
