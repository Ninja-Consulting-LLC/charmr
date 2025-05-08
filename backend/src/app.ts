import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import {config} from './config/config';
import {
  createUser,
  getUser,
  linkAnonymousUser,
  updateUserPlan,
} from './controllers/adminController';
import {createReplyController} from './controllers/replyController';
import {getDatabase} from './db';
import {authenticateUser} from './middleware/auth';
import {createRateLimiter} from './middleware/rateLimit';
import {requestLogger} from './middleware/requestLogger';
import adminRoutes from './routes/adminRoutes';
import matchRoutes from './routes/matchRoutes';
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

  // Main application routes
  app.get('/api/users/:userId', authenticateUser, getUser);
  app.put('/api/users/:userId/plan', authenticateUser, updateUserPlan);
  app.post('/api/users/link', authenticateUser, linkAnonymousUser);
  app.post('/api/users', authenticateUser, createUser);
  app.post('/api/generate-reply', authenticateUser, (req, res) => {
    logger.info('Route instantiated: POST /api/generate-reply');
    return replyController.generateReplyHandler(req, res);
  });

  app.post('/api/support', authenticateUser, async (req, res) => {
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

  // Create admin router
  const adminRouter = express.Router();

  // Use admin routes
  adminRouter.use('/', adminRoutes);

  // Mount admin router
  app.use('/api/admin', adminRouter);

  // Mount match routes
  app.use('/api', matchRoutes);

  // Create utility router for testing/development endpoints
  const utilityRouter = express.Router();

  // Utility routes (only available in development)
  if (process.env.NODE_ENV !== 'production') {
    utilityRouter.get('/health', (req, res) => {
      res.json({status: 'ok', timestamp: new Date().toISOString()});
    });
  }

  // Mount utility router
  app.use('/api/utility', utilityRouter);

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
