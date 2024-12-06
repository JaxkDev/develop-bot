const { getConfig } = require('../../config');
const logger = require('../../logger');

// Run this every minute
module.exports = {
	name: 'FactionBank',
    cron: '0 * * * *',
	async execute(client) {
        logger.warn('FactionApplications scheduled task is not implemented, this is just testing the timer.');
	},
};