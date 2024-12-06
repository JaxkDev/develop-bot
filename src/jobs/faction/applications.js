const { getConfig } = require('../../config');
const logger = require('../../logger');

// Run this every 2 hours
module.exports = {
	name: 'FactionApplications',
    cron: '0 */2 * * *',
	async execute(client) {
        logger.warn('FactionApplications scheduled task is not implemented, this is just testing the timer.');
	},
};