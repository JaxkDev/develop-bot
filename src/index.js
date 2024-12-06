require('dotenv').config({ path: 'data/.env' });
process.env.ENVIRONMENT = process.env.ENVIRONMENT || 'dev';

const { Client, Collection, GatewayIntentBits } = require('discord.js');
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
		client.once(event.name, async (...args) => await event.execute(client, ...args));
	} else {
		client.on(event.name, async (...args) => await event.execute(client, ...args));
	}
}
logger.debug('Events registered.');

client.login(process.env.DISCORD_TOKEN);
