import cors from 'cors';
import express, {Application} from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import {config} from './config/config';
import {databaseConfig} from './config/database';
import {
  createUser,
  deleteUser,
  getUser,
  getUserByInstallationId,
  linkAnonymousUser,
  updateUser,
  updateUserPlan,
} from './controllers/adminController';
import {checkSchemaHealth} from './controllers/devController';
import {createReplyController} from './controllers/replyController';
import {getDatabase} from './db';
import {pingDatabase} from './db/pingDatabase';
import type {Database} from './db/types';
import {
  createDeviceTokenLimiter,
  createErrorHandler,
  createUserCreationLimiter,
} from './middleware';
import {validateBody} from './middleware/validateBody';
import {authenticateUser} from './middleware/auth';
import {createRateLimiter} from './middleware/rateLimit';
import {correlationId} from './middleware/correlationId';
import {requestLogger} from './middleware/requestLogger';
import createAdminRouter from './routes/adminRoutes';
import createDevRouter from './routes/devRoutes';
import matchRoutes from './routes/matchRoutes';
import createPushNotificationRouter from './routes/pushNotificationRoutes';
import createSupportTicketsRouter from './routes/supportRoutes';
import {createEmailService, createSupportEmailService} from './services/email';
import {SupportRequest} from './types/email';
import {
  generateReplyBodySchema,
  supportRequestBodySchema,
} from './validation/apiSchemas';
import logger, {stream} from './utils/logger';

export const createApp = async (): Promise<{app: Application; db: Database}> => {
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

  app.use(correlationId);

  // Root path endpoint - API information and documentation
  app.get('/', (_req, res) => {
    const apiInfo = {
      name: 'Charmr API',
      version: '1.0.0',
      description: 'Backend API for the Charmr dating assistant application',
      environment: config.server.environment,
      endpoints: [
        {method: 'GET', path: '/health', description: 'Liveness (process up)'},
        {
          method: 'GET',
          path: '/health/ready',
          description: 'Readiness (database reachable)',
        },
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
  app.get('/health', (_req, res) => {
    res.status(200).json({status: 'ok', timestamp: new Date().toISOString()});
  });

  app.get('/health/ready', async (_req, res) => {
    try {
      await pingDatabase(db);
      res.status(200).json({
        status: 'ready',
        database: databaseConfig.type,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Readiness check failed', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(503).json({
        status: 'not_ready',
        database: databaseConfig.type,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Rate limiting (skip global limiter in development — local E2E + hot reload exceed low caps quickly)
  if (config.server.environment !== 'development') {
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use(limiter);
  }

  // Logging middleware
  app.use(morgan('combined', {stream}));

  // Body parsing middleware
  // Base64 screenshots can be large; cap to limit accidental huge payloads (DoS).
  app.use(express.json({limit: '25mb'}));
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
  app.put('/api/users/:userId', authenticateUser, (req, res) =>
    updateUser(req, res, db),
  );
  app.delete('/api/users/:userId', authenticateUser, (req, res) =>
    deleteUser(req, res, db),
  );
  app.put('/api/users/:userId/plan', authenticateUser, (req, res) =>
    updateUserPlan(req, res, db),
  );
  app.put(
    '/api/users/:userId/device-token',
    authenticateUser,
    createDeviceTokenLimiter(),
    async (req, res) => {
      try {
        const {deviceToken} = req.body;
        if (!deviceToken) {
          return res.status(400).json({error: 'Device token is required'});
        }

        await db.updateUser(req.params.userId, {deviceToken});
        logger.info('Updated device token for user', {
          userId: req.params.userId,
          deviceToken,
          timestamp: new Date().toISOString(),
        });

        res.json({success: true});
      } catch (error) {
        logger.error('Failed to update device token', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          userId: req.params.userId,
        });
        res.status(500).json({
          error: 'Failed to update device token',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  );
  app.post('/api/users/link', authenticateUser, (req, res) =>
    linkAnonymousUser(req, res, db),
  );
  app.post(
    '/api/users',
    authenticateUser,
    createUserCreationLimiter(),
    async (req, res) => {
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
    },
  );
  app.post(
    '/api/generate-reply',
    authenticateUser,
    validateBody(generateReplyBodySchema),
    (req, res) => {
      logger.debug('Route instantiated: POST /api/generate-reply');
      return replyController.generateReplyHandler(req, res);
    },
  );

  app.use('/api/support/tickets', createSupportTicketsRouter(db));

  app.post(
    '/api/support',
    authenticateUser,
    validateBody(supportRequestBodySchema),
    async (req, res) => {
      logger.debug('Support email request', {
        bodyKeys:
          req.body && typeof req.body === 'object'
            ? Object.keys(req.body as object)
            : [],
      });
      try {
        const supportRequest: SupportRequest = req.body;
        await supportEmailService.sendSupportRequest(supportRequest);
        res.status(200).json({message: 'Support request received'});
      } catch (error) {
        logger.error('Failed to send support email:', {error});
        res.status(500).json({error: 'Failed to process support request'});
      }
    },
  );

  // Create admin router
  const adminRouter = createAdminRouter(db);

  // Mount admin router
  app.use('/api/admin', adminRouter);

  // Mount match routes
  app.use('/api', matchRoutes(db));

  // Mount push notification routes
  app.use('/api/push-notifications', createPushNotificationRouter(db));

  // Create utility router for testing/development endpoints
  const utilityRouter = express.Router();

  // Utility routes (only available in development)
  if (process.env.NODE_ENV !== 'production') {
    utilityRouter.get('/health', (_req, res) => {
      res.json({status: 'ok', timestamp: new Date().toISOString()});
    });

    utilityRouter.get('/check-schema-health', (req, res) => {
      return checkSchemaHealth(req, res, db);
    });
  }

  // Mount utility router
  app.use('/api/utility', utilityRouter);

  // Dev routes (only in development)
  if (process.env.NODE_ENV === 'development') {
    app.use('/api/dev', createDevRouter(db));
  }

  // Log all available routes on startup
  const routes = app._router.stack
    .filter((r: any) => r.route)
    .map((r: any) => {
      const methods = Object.keys(r.route.methods).join(', ').toUpperCase();
      return `${methods} ${r.route.path}`;
    });

  logger.debug('Available routes:', {routes});

  app.use(createErrorHandler());

  return {app, db};
};
