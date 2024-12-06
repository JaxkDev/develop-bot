const { getConfig } = require('../../config');
const logger = require('../../logger');

// Run this every minute
module.exports = {
	name: 'FactionAttacks',
    cron: '* * * * *',
	async execute(client) {
        logger.warn('FactionAttacks scheduled task is not implemented, this is just testing the timer.');
	},
};