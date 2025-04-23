import app from './app';
import {config} from './config/config';
import logger from './utils/logger';

const port = config.server.port;

app.listen(port, () => {
  logger.info('Server started', {
    port,
    environment: config.server.environment,
  });
});
