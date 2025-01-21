const { Events, Client, GuildMember, userMention } = require('discord.js');
const { getConfig } = require('../../config');
const logger = require('../../logger');
const axios = require('axios');

module.exports = {
	event: Events.GuildMemberAdd,
	once: false,

    /**
     * @param {Client} client 
     * @param {GuildMember} member
     */
	async handle(client, member) {
        const config = getConfig();
        const channel = client.channels.cache.get(config.channels['welcome']);

        if (!channel) {
            logger.error('Member logging channel not found - please check your config. (' + config.channels['welcome'] + ')');
            return;
        }

        // Check if the member is a bot
        if (member.user.bot) {
            return;
        }

        let verified = false;

        // Check user id against torn api
        // API: https://api.torn.com/v2/user?selections=basic,profile&id=DISCORD_ID&key=API_KEY
        axios.get(`${config.api}/user?selections=basic,profile&id=${member.id}&key=${process.env.TORN_KEY}`).then(res => {
            if (res.data.error) {
                logger.error('Failed to verify account with Torn.', { error: res.data.error });
                return;
            } else {
                const id = res.data.player_id;
                const name = res.data.name;
                const faction = res.data.faction;

                verified = true;

                // Update the user's nickname with their Torn name (Faction Position) [ID]
                member.setNickname(`${name} [${id}]`).catch(err => {
                    channel.send({ content: 'Failed to update your nickname to: `' + name + ' [' + id + ']`' });
                    logger.error('Failed to update nickname.', { error: err });
                });
            }
        }).catch(err => {
            logger.error(err)
        }).finally(() => {
            channel.send({ content: `Welcome to the server, ${userMention(member.id)}!\n\nAny questions, please ask!\nThere are many people here who will happily provide bias free advise.\n\n` + (verified ? 'Your account has been verified with Torn, and account has been linked.' : 'Please verify your account with Torn by using this link (https://discordapp.com/api/oauth2/authorize?client_id=441210177971159041&redirect_uri=https%3A%2F%2Fwww.torn.com%2Fdiscord.php&response_type=code&scope=identify) and then using the /verify command.') });
        });
    },
};