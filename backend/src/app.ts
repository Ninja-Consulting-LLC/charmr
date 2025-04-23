import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import {config} from './config/config';
import {createReplyController} from './controllers/replyController';
import {createGeneralLimiter} from './middleware/rateLimit';
import {requestLogger} from './middleware/requestLogger';
import {createEmailService, createSupportEmailService} from './services/email';
import {SupportRequest} from './services/email/types';
import logger, {stream} from './utils/logger';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.security.cors.origin,
    credentials: true,
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Logging middleware
app.use(morgan('combined', {stream}));

// Body parsing middleware
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({extended: true}));

// Initialize middleware
app.use(createGeneralLimiter());
app.use(requestLogger);

// Initialize email services
const emailService = createEmailService(config.email);
const supportEmailService = createSupportEmailService(
  emailService,
  config.email.defaultFrom,
);

// Initialize controllers
const replyController = createReplyController();

// Routes
app.post('/api/generate-reply', (req, res) =>
  replyController.generateReplyHandler(req, res),
);
app.post('/api/support', async (req, res) => {
  try {
    const supportRequest: SupportRequest = req.body;
    await supportEmailService.sendSupportRequest(supportRequest);
    res.status(200).json({message: 'Support request received'});
  } catch (error) {
    logger.error('Failed to send support email:', {error});
    res.status(500).json({error: 'Failed to process support request'});
  }
});

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    logger.error('Unhandled error:', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : err.message,
    });
  },
);

export default app;
