import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import {config} from './config/config';
import {emailConfig} from './config/email';
import {createReplyController} from './controllers/replyController';
import {
  createErrorHandler,
  createGeneralLimiter,
  createGenerateReplyLimiter,
  createRequestValidator,
} from './middleware';
import supportRoutes from './routes/supportRoutes';
import {createEmailService, createSupportEmailService} from './services/email';
import {logEnvironmentVariables} from './utils/envUtils';

export const createApp = () => {
  const app = express();
  const replyController = createReplyController();

  // Log environment variables
  logEnvironmentVariables();

  // Initialize middleware
  app.use(
    cors({
      origin: config.security.cors.origin,
    }),
  );
  app.use(bodyParser.json({limit: '50mb'}));
  app.use(createGeneralLimiter());

  // Initialize email services
  const emailService = createEmailService(emailConfig);
  const supportEmailService = createSupportEmailService(
    emailService,
    process.env.SUPPORT_EMAIL || 'support@charmr.app',
  );

  // Make services available to routes
  app.locals.emailService = emailService;
  app.locals.supportEmailService = supportEmailService;

  // Logger middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Initialize routes
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  app.post(
    '/api/generate-reply',
    createGenerateReplyLimiter(),
    createRequestValidator(),
    (req, res) => replyController.generateReply(req, res),
  );

  // Routes
  app.use('/api/support', supportRoutes);

  // Initialize error handling
  app.use(createErrorHandler());

  const start = () => {
    const port = config.server.port;
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log(`Environment: ${config.server.environment}`);
      console.log(
        `Sandbox mode: ${config.openai.sandboxMode ? 'enabled' : 'disabled'}`,
      );
    });
  };

  return {
    start,
  };
};
