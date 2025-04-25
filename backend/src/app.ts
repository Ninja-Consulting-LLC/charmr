import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import {config} from './config/config';
import {
  createUser,
  getUserMessages,
  getUsers,
  resetUserMessageLimit,
  updateUserPlan,
} from './controllers/adminController';
import {createReplyController} from './controllers/replyController';
import {getDatabase} from './db';
import {adminAuth} from './middleware/adminAuth';
import {createRateLimiter} from './middleware/rateLimit';
import {requestLogger} from './middleware/requestLogger';
import {createEmailService, createSupportEmailService} from './services/email';
import {SupportRequest} from './services/email/types';
import logger, {stream} from './utils/logger';

export const createApp = async () => {
  const app = express();

  // Initialize database
  await getDatabase();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: config.security.cors.origin,
      credentials: true,
    }),
  );

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: config.server.environment,
    });
  });

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
  app.use(createRateLimiter());
  app.use(requestLogger);

  // Initialize email services
  const emailService = createEmailService(config.email);
  const supportEmailService = createSupportEmailService(
    emailService,
    config.email.defaultFrom,
  );

  // Initialize controllers
  const replyController = await createReplyController();

  // Routes
  app.post('/api/generate-reply', (req, res) => {
    logger.info('Route instantiated: POST /api/generate-reply');
    return replyController.generateReplyHandler(req, res);
  });

  app.post('/api/support', async (req, res) => {
    logger.info('Route instantiated: POST /api/support');
    try {
      const supportRequest: SupportRequest = req.body;
      await supportEmailService.sendSupportRequest(supportRequest);
      res.status(200).json({message: 'Support request received'});
    } catch (error) {
      logger.error('Failed to send support email:', {error});
      res.status(500).json({error: 'Failed to process support request'});
    }
  });

  // Admin routes
  app.get('/api/admin/users', adminAuth, getUsers);
  app.post('/api/admin/users', adminAuth, createUser);
  app.get('/api/admin/users/:userId/messages', adminAuth, getUserMessages);
  app.post(
    '/api/admin/users/:userId/reset-limit',
    adminAuth,
    resetUserMessageLimit,
  );
  app.put('/api/admin/users/:userId/plan', adminAuth, updateUserPlan);

  // Log all available routes on startup
  const routes = app._router.stack
    .filter((r: any) => r.route)
    .map((r: any) => {
      const methods = Object.keys(r.route.methods).join(', ').toUpperCase();
      return `${methods} ${r.route.path}`;
    });

  logger.info('Available routes:', {routes});

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

  return app;
};
