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

        // let twar = {
        //     factions: [
        //       {id: 8869, name: 'Bendetti', score: 4393, chain: 0 },
        //       {id: 51716, name: 'Develop (Hiring)', score: 3896, chain: 0 }
        //     ],
        //     start: 1738861200, end: 1739257200, target: 497, winner: 8869,
        //     war_id: 22005
        // }
        // try{
        //     generateAllReports(client, twar, true);
        // } catch(err) {
        //     logger.error("Failed to gen report:", {'err': err.toString()})
        // }
        // console.log('done');
	},
};