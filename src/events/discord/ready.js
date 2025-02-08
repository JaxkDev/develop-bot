const { Events, Client, Collection } = require('discord.js');
const { getConfig } = require('../../config');
const schedule = require('node-schedule');
const logger = require('../../logger');
const generateAllReports = require('../../scripts/reports/postWarReports');

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

        
        // Load scheduled jobs
        client.jobs = new Collection();
        for (const job of require('../../jobs/loader')) {
            const j = schedule.scheduleJob(job.cron, async function(){
                try {
                    await job.execute(client)
                } catch (error) {
                    logger.error(`Error executing job ${job.name}`, { error: error.toString() });
                }
            });
            client.jobs.set(job.name, j);
        }
        logger.debug('Jobs scheduled with scheduler.');

        let twar = {
            factions: [
              {id: 49924, name: 'OnlyXans Premium', score: 3430, chain: 0 },
              {id: 51716, name: 'Develop (Hiring)', score: 575, chain: 0 }
            ],
            start: 1734120000, end: 1734287451, target: 2849, winner: 49924,
            war_id: 20318
          }
          console.log(twar);
        try{
            generateAllReports(client, twar, true);
        } catch(err) {
            logger.error("Failed to gen report:", {'err': err.toString()})
        }
        console.log('done');
	},
};