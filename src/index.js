require('dotenv').config({ path: 'data/.env' });
process.env.ENVIRONMENT = process.env.ENVIRONMENT || 'dev';

const { Client, Collection, GatewayIntentBits } = require('discord.js');
const schedule = require('node-schedule');
const logger = require('./logger');

logger.info(`Starting application [${process.env.ENVIRONMENT}]...`);

require('../scripts/deploy-commands');

const client = new Client({
    intents: Object.keys(GatewayIntentBits).map((a)=>{
        return GatewayIntentBits[a]
    })
});

// Load commands
client.commands = new Collection();
const commands = require('./commands/loader');
for (const command of commands) {
    client.commands.set(command.data.name, command);
}

// Load events
for (const event of require('./events/loader')) {
	if (event.once) {
		client.once(event.event, async function(...args){ 
			try {
				await event.handle(client, ...args)
			} catch (error) {
				logger.error(`Error executing event ${event.event}`, { error: error });
			}
		});
	} else {
		client.on(event.event, async function(...args){
			try {
				await event.handle(client, ...args)
			} catch (error) {
				logger.error(`Error executing event ${event.event}`, { error: error });
			}
		});
	}
}
logger.debug('Events registered.');

// Load scheduled jobs
client.jobs = new Collection();
for (const job of require('./jobs/loader')) {
	const j = schedule.scheduleJob(job.cron, async function(){
		try {
			await job.execute(client)
		} catch (error) {
			logger.error(`Error executing job ${job.name}`, { error: error });
		}
	});
	client.jobs.set(job.name, j);
}
logger.debug('Jobs scheduled with scheduler.');

client.login(process.env.DISCORD_TOKEN);
