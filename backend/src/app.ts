import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import {config} from './config/config';
import {
  createUser,
  getUser,
  getUserByInstallationId,
  linkAnonymousUser,
  updateUserPlan,
} from './controllers/adminController';
import {checkSchemaHealth} from './controllers/devController';
import {createReplyController} from './controllers/replyController';
import {getDatabase} from './db';
import {authenticateUser} from './middleware/auth';
import {createRateLimiter} from './middleware/rateLimit';
import {requestLogger} from './middleware/requestLogger';
import createAdminRouter from './routes/adminRoutes';
import matchRoutes from './routes/matchRoutes';
import {createEmailService, createSupportEmailService} from './services/email';
import {SupportRequest} from './services/email/types';
import logger, {stream} from './utils/logger';

export const createApp = async () => {
  const app = express();

  // Initialize database
  const db = await getDatabase();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: config.security.cors.origin,
      credentials: true,
    }),
  );

  // Root path endpoint - API information and documentation
  app.get('/', (req, res) => {
    const apiInfo = {
      name: 'Charmr API',
      version: '1.0.0',
      description: 'Backend API for the Charmr dating assistant application',
      environment: config.server.environment,
      endpoints: [
        {method: 'GET', path: '/health', description: 'Health check endpoint'},
        {
          method: 'GET',
          path: '/api/users/:userId',
          description: 'Get user information',
        },
        {
          method: 'PUT',
          path: '/api/users/:userId/plan',
          description: 'Update user subscription plan',
        },
        {
          method: 'POST',
          path: '/api/users/link',
          description: 'Link anonymous user to registered user',
        },
        {method: 'POST', path: '/api/users', description: 'Create a new user'},
        {
          method: 'POST',
          path: '/api/generate-reply',
          description: 'Generate AI response for dating conversations',
        },
        {
          method: 'POST',
          path: '/api/support',
          description: 'Submit a support request',
        },
      ],
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(apiInfo);
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({status: 'ok', timestamp: new Date().toISOString()});
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
    config.supportEmail,
  );

  // Initialize controllers
  const replyController = await createReplyController(db);

  // Main application routes
  app.get(
    '/api/users/installation/:installationId',
    authenticateUser,
    (req, res) => getUserByInstallationId(req, res, db),
  );
  app.get('/api/users/:userId', authenticateUser, (req, res) =>
    getUser(req, res, db),
  );
  app.put('/api/users/:userId/plan', authenticateUser, (req, res) =>
    updateUserPlan(req, res, db),
  );
  app.post('/api/users/link', authenticateUser, (req, res) =>
    linkAnonymousUser(req, res, db),
  );
  app.post('/api/users', authenticateUser, async (req, res) => {
    const user = await createUser(db, {
      id: req.body.id,
      email: req.body.email,
      name: req.body.name,
      plan: req.body.plan,
      installationId: req.body.installationId,
    });
    if (user) {
      res.status(201).json(user);
    } else {
      res.status(400).json({error: 'Failed to create user'});
    }
  });
  app.post('/api/generate-reply', authenticateUser, (req, res) => {
    logger.info('Route instantiated: POST /api/generate-reply');
    return replyController.generateReplyHandler(req, res);
  });

  app.post('/api/support', authenticateUser, async (req, res) => {
    console.log('RAW SUPPORT REQUEST BODY:', req.body);
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
  const adminRouter = createAdminRouter(db);

  // Mount admin router
  app.use('/api/admin', adminRouter);

  // Mount match routes
  app.use('/api', matchRoutes(db));

  // Create utility router for testing/development endpoints
  const utilityRouter = express.Router();

  // Utility routes (only available in development)
  if (process.env.NODE_ENV !== 'production') {
    utilityRouter.get('/health', (req, res) => {
      res.json({status: 'ok', timestamp: new Date().toISOString()});
    });

    utilityRouter.get('/check-schema-health', (req, res) => {
      return checkSchemaHealth(req, res, db);
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
