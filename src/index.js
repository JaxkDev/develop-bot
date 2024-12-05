require('dotenv').config({ path: 'data/.env' })

const { getConfig } = require('./config');
const { logger } = require('./logger');

logger.info('Starting application...');
