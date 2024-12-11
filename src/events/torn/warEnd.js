const { EmbedBuilder, Client, bold, hyperlink } = require('discord.js');
const { getConfig } = require('../../config');
const logger = require('../../logger');

module.exports = {
	event: 'torn-war-end',
    once: false,

    /**
     * Handles the attacks event.
     * 
     * @param {Client} client Discord client.
     * @param {{
     *  "war_id": 19936,
     *  "start": 1733508000,
     *  "end": 1733669016,
     *  "target": 2449,
     *  "winner": 51716,
     *  "factions": [{
     *      "id": 50478,
     *      "name": "The Dreaded TEAM SESH",
     *      "score": 1836,
     *      "chain": 0
     *  },
     *  {
     *      "id": 51716,
     *      "name": "Develop (Hiring)",
     *      "score": 4290,
     *      "chain": 1
     *  }]
     * }} war Raw data from the Torn API.
     * 
     * @see https://www.torn.com/swagger/index.html#/Faction/get_faction_members Torn API - Faction Members
     */
	async handle(client, war) {
        const config = getConfig();
        if(channel === null) channel = client.channels.cache.get(config.channels['war-log']);

        if (!channel) {
            logger.error('War logging channel not found - please check your config. (' + config.channels['war-log'] + ')');
            return;
        }

        
	},
};