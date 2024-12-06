const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType, userMention, roleMention, spoiler, bold} = require('discord.js');
const { getConfig } = require('../../config');
const logger = require('../../logger');

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
            return await interaction.reply({ content: 'You must provide either an amount or use the `all` option.', ephemeral: true });
        }
        // If both amount and all are provided, return an error
        if (interaction.options.getString('amount') && interaction.options.getBoolean('all')) {
            return await interaction.reply({ content: 'You cannot provide both an amount and use the `all` option.', ephemeral: true });
        }

        // TODO Link discord user to Torn user, then check their faction and bank balance.

        // Send an embed to a channel for approval
        const exampleEmbed = new EmbedBuilder()
            .setColor(0xffbf00)
            .setTitle('Bank Withdrawal Request')
            .setDescription('A faction member has requested a withdrawal from the faction bank.')
            .setTimestamp()
            .addFields(
                { name: 'User', value: interaction.user.tag + " (" + userMention(interaction.user.id) + ")", inline: false },
                { name: 'Type', value: interaction.options.getString('type'), inline: true },
                { name: 'Amount', value: interaction.options.getBoolean('all') ? 'All' : interaction.options.getString('amount'), inline: true },
                { name: 'When', value: interaction.options.getString('when'), inline: true },
            );
        
        const Processed = new ButtonBuilder()
			.setCustomId('done')
			.setLabel('Processed')
			.setStyle(ButtonStyle.Success);

		const Rejected = new ButtonBuilder()
			.setCustomId('reject')
			.setLabel('Rejected')
			.setStyle(ButtonStyle.Danger);

        const Reply = new ButtonBuilder()
            .setCustomId('reply')
            .setLabel('Reply when Online')
            .setStyle(ButtonStyle.Secondary);

        const buttonRow = new ActionRowBuilder()
            .addComponents(Processed, Rejected);

        if (interaction.options.getString('when') === 'When Online') {
            buttonRow.addComponents(Reply);
        }

        // Send the embed to a channel for approval
        const embed_msg = await interaction.guild.channels.cache.get(getConfig().channels.bank).send({
            content: spoiler(roleMention(getConfig().roles.treasurer)),
            embeds: [exampleEmbed],
            components: [buttonRow]
        });

        await interaction.reply({ content: 'Your request has been submitted.', ephemeral: true });

        // filter by treasurer role id against member roles
        // const hasRole = interaction.member.roles.cache.some(role => role.id === getConfig().roles.treasurer);
        const collectionFilter = i => i.member.roles.cache.some(role => role.id === getConfig().roles.treasurer);
        const collector = embed_msg.createMessageComponentCollector({ componentType: ComponentType.Button, filter: collectionFilter });

        collector.on('collect', async confirmation => {
            if (confirmation.customId === 'done') {
                await embed_msg.edit({
                    embeds: [
                        exampleEmbed
                        .setColor(0x00ff00)
                        .addFields(
                            { name: "Status", value: "Processed", inline: true },
                            { name: "Processed By", value: confirmation.user.tag + " (" + userMention(confirmation.user.id)+")", inline: true },
                            { name: "Processed At", value: new Date().toLocaleString(), inline: true }
                        )
                    ],
                    components: []
                });
                await confirmation.reply({
                    content: 'Request changed to ' + bold('processed'),
                    ephemeral: true
                });
            } else if (confirmation.customId === 'reject') {
                await embed_msg.edit({
                    embeds: [
                        exampleEmbed
                        .setColor(0xff0000)
                        .addFields(
                            { name: "Status", value: bold("REJECTED"), inline: true },
                            { name: "Processed By", value: confirmation.user.tag + " (" + userMention(confirmation.user.id)+")", inline: true },
                            { name: "Processed At", value: new Date().toLocaleString(), inline: true }
                        )
                    ],
                    components: []
                });
                await confirmation.reply({
                    content: 'Request has been ' + bold('REJECTED'),
                    ephemeral: true
                });
            } else if (confirmation.customId === 'reply') {
                // Send a message in this channel mentioning the user to reply when they are online.
                
                await confirmation.channel.send({
                    content: userMention(interaction.user.id) + ', please reply to ' + userMention(confirmation.user.id) + ' when you are online to proceed with your bank withdrawal request.',
                    components: []
                })

                await confirmation.reply({
                    content: 'You have asked the user to reply when online.',
                    ephemeral: true
                });
            } else {
                await confirmation.reply({
                    content: 'Invalid button clicked.',
                    ephemeral: true
                });
                logger.error('Invalid button clicked on withdraw buttons.', { button: confirmation });
            }
        });
	},
};