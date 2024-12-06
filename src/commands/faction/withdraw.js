const { SlashCommandBuilder, EmbedBuilder, userMention, roleMention, spoiler} = require('discord.js');
const { getConfig } = require('../../config');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('withdraw')
		.setDescription('Withdraw a specified amount of money or points from your faction bank.')
        .addStringOption(option =>
            option.setName('when')
                .setDescription('When should we send it to you?')
                .setRequired(true)
                .addChoices(
                    { 'name': 'When Online', 'value': 'When Online' },
                    { 'name': 'Anytime', 'value': 'Anytime' }
                )
            )
        
        .addStringOption(option =>
            option.setName('type')
                .setDescription('The type of currency to withdraw.')
                .setRequired(true)
                .addChoices(
                    { 'name': 'Money', 'value': 'Money' },
                    { 'name': 'Points', 'value': 'Points' }
                )
            )

        .addStringOption(option =>
            option.setName('amount')
                .setDescription('The amount to withdraw.')
                .setRequired(false)
                .setMinLength(1)
                .setMaxLength(10)
            )

        .addBooleanOption(option =>
            option.setName('all')
                .setDescription('Withdraw all of your available currency?')
                .setRequired(false)
            ),

	async execute(interaction) {
        // If neither amount nor all is provided, return an error
        if (!interaction.options.getString('amount') && !interaction.options.getBoolean('all')) {
            return await interaction.editReply({ content: 'You must provide either an amount or use the `all` option.', ephemeral: true });
        }
        // If both amount and all are provided, return an error
        if (interaction.options.getString('amount') && interaction.options.getBoolean('all')) {
            return await interaction.editReply({ content: 'You cannot provide both an amount and use the `all` option.', ephemeral: true });
        }

        // TODO Link discord user to Torn user, then check their faction and bank balance.

        // Send an embed to a channel for approval
        const exampleEmbed = new EmbedBuilder()
            .setColor(0x22F2FF)
            .setTitle('Bank Withdrawal Request')
            .setDescription('A faction member has requested a withdrawal from the faction bank.')
            .setTimestamp()
            .addFields(
                { name: 'User', value: interaction.user.tag + " (" + userMention(interaction.user.id) + ")", inline: false },
                { name: 'Type', value: interaction.options.getString('type'), inline: true },
                { name: 'Amount', value: interaction.options.getBoolean('all') ? 'All' : interaction.options.getString('amount'), inline: true },
                { name: 'When', value: interaction.options.getString('when'), inline: true },
            );

        // Send the embed to a channel for approval
        await interaction.guild.channels.cache.get(getConfig().channels.bank).send({ content: spoiler(roleMention(getConfig().roles.treasurer)), embeds: [exampleEmbed] });

		await interaction.editReply({ content: 'Your request has been submitted.', ephemeral: true });
	},
};