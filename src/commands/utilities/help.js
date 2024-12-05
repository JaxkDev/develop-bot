const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Provies you with a navigatable help menu that documents all commands.'),
	async execute(interaction) {
		await interaction.reply('Help documentation currently in progress.');
	},
};