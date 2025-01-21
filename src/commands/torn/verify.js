const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType, userMention, roleMention, spoiler, bold} = require('discord.js');
const { getConfig } = require('../../config');
const logger = require('../../logger');
const axios = require('axios');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('verify')
		.setDescription('Verify your discord account with torn.'),

	async execute(interaction) {

        // API: https://api.torn.com/v2/user?selections=basic,profile&id=DISCORD_ID&key=API_KEY

        axios.get(`${getConfig().api}/user?selections=basic,profile&id=${interaction.user.id}&key=${process.env.TORN_KEY}`)
        .then(res => {
            if (res.data.error) {
                interaction.reply({ content: 'Failed to verify your account with Torn\nPlease use this link to verify with torn then re-run the command once completed.\n\nhttps://discordapp.com/api/oauth2/authorize?client_id=441210177971159041&redirect_uri=https%3A%2F%2Fwww.torn.com%2Fdiscord.php&response_type=code&scope=identify', ephemeral: false });
                logger.error('Failed to verify account with Torn.', { error: res.data.error });
                return;
            } else {
                const id = res.data.player_id;
                const name = res.data.name;
                const faction = res.data.faction;

                //LINK IN DB?

                // Update the user's nickname with their Torn name (Faction Position) [ID]
                interaction.member.setNickname(`${name} [${id}]`).catch(err => {
                    logger.error('Failed to update nickname.', { error: err });
                    interaction.reply({ content: 'Failed to update your nickname!', ephemeral: false });
                }).then(() => {
                    interaction.reply({ content: 'Your account has been verified with Torn, and account has been linked.', ephemeral: true });
                });
            }
        })
        .catch(err => {
            console.error(err)
        });
	},
};