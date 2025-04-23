import {createApp} from './app';
import {config} from './config/config';
import logger from './utils/logger';

const startServer = async () => {
  try {
    const app = await createApp();
    const port = config.server.port;

    app.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
};

startServer();
