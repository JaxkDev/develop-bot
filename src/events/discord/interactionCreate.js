const { Events, Client } = require('discord.js');
const { getConfig } = require('../../config');
const logger = require('../../logger');

module.exports = {
	event: Events.InteractionCreate,
	once: false,

    /**
     * @param {Client} client 
     * @param {*} interaction
     */
	async handle(client, interaction) {
		if (!interaction.isChatInputCommand()) return;

        interaction.user = interaction.user ?? interaction.member.user;

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.warn(`No command matching ${interaction.commandName} was found.`);
            await interaction.reply({ content: 'This command is under maintenance!', ephemeral: true });
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
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
            } else {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        }
	},
};