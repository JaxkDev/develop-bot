const { getConfig } = require('../../config');
const logger = require('../../logger');

// Run this every hour
module.exports = {
	name: 'FactionCrimes',
    cron: '0 * * * *',
	async execute(client) {
        logger.warn('FactionCrimes scheduled task is not implemented, this is just testing the timer.');
	},
};