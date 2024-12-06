const { Events, Client } = require('discord.js');
const { getConfig } = require('../../config');
const logger = require('../../logger');

module.exports = {
	event: Events.ClientReady,
	once: true, 

    /**
     * 
     * @param {Client} client 
     * @param {Client} bot 
     */
	async handle(client, bot) {
		if(bot.user.id !== getConfig().client_id){
            logger.error(`config client ID does not match the logged in bot user ID. Expected ${getConfig().client_id} but got ${bot.user.id}`);
            logger.error('Please check your config.json file and ensure the client_id is correct, then restart the bot.');
            process.exit(1);
        }
        logger.info(`Bot (${bot.user.tag}) is ready.`);
        client.user.setPresence({ activities: [{ name: 'in Torn City' }], status: process.env.ENVIRONMENT === "prod" ? 'online' : 'dnd' });
	},
};