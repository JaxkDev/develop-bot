const { getConfig } = require('../../config');
const logger = require('../../logger');

// Run this every minute
module.exports = {
	name: 'ApiFaction',
    cron: '* * * * *',
	async execute(client) {
        logger.warn('ApiFaction scheduled task is not implemented, this is just testing the timer.');
	},
};