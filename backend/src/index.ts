import { createApp } from './app';
import { config } from './config/config';
import { resetMessageCounts } from './cron/resetMessageCounts';
import { getDatabase } from './db';
import { getEnvironmentInfo } from './utils/envUtils';
import logger from './utils/logger';

const startServer = async () => {
  try {
    // Log environment variables and configuration
    getEnvironmentInfo();

    const app = await createApp();
    const port = config.server.port;

    // Initialize database for cron jobs
    const db = await getDatabase();

    // Set up daily message count reset (runs at midnight UTC)
    setInterval(async () => {
      const now = new Date();
      if (now.getUTCHours() === 0 && now.getUTCMinutes() === 0) {
        await resetMessageCounts(db);
      }
    }, 60000); // Check every minute

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
