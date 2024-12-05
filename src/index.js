require('dotenv').config({ path: 'data/.env' });

const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { getConfig } = require('./config');
const { logger } = require('./logger');

logger.info('Starting application...');

const client = new Client({
    intents: Object.keys(GatewayIntentBits).map((a)=>{
        return GatewayIntentBits[a]
    })
});

client.commands = new Collection();

const commands = require('./commands/loader');
for (const command of commands) {
    client.commands.set(command.data.name, command);
}

client.once(Events.ClientReady, (bot) => {
    logger.info(`Bot (${bot.user.tag}) is ready.`);
    client.user.setPresence({ activities: [{ name: 'in Torn City' }] });
});

client.on(Events.Error, (error) => {
    logger.error('An error occurred:', error);
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

    interaction.user = interaction.user ?? interaction.member.user;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.warn(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
        if (getConfig().maintenance && interaction.user.id !== getConfig().owner_id) {
            await interaction.reply({ content: 'The bot is currently undergoing maintenance, please try again later.', ephemeral: true });
            return;
        }
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		}
	}
});


client.login(process.env.DISCORD_TOKEN);
