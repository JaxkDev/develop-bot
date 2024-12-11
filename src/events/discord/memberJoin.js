const { Events, Client, GuildMember, userMention } = require('discord.js');
const { getConfig } = require('../../config');
const logger = require('../../logger');

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

        await channel.send({ content: `Welcome to the server, ${userMention(member.id)}!\n\nAny questions, please ask!\nThere are many people here who will happily provide bias free advise.\n\nAlso please let us know your Torn name so we know who this is :)` });
	},
};