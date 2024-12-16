const { EmbedBuilder, Client, bold, time, hyperlink} = require('discord.js');
const { getConfig } = require('../../../config');
const logger = require('../../../logger');

let channel = null;

module.exports = {
	event: 'torn-war-chosen',
    once: false,

    /**
     * Handles the war selection event.
     * 
     * @param {Client} client Discord client.
     * @param {{
     *  "war_id": Number,
     *  "start": EpochTimeStamp,
     *  "end": 0,
     *  "target": Number,
     *  "winner": Number,
     *  "factions": [{
     *      "id": Number,
     *      "name": String,
     *      "score": 0,
     *      "chain": 0
     *  },
     *  {
     *      "id": Number,
     *      "name": String,
     *      "score": 0,
     *      "chain": 0
     *  }]
     * }} war Raw data from the Torn API.
     * 
     * @see https://www.torn.com/swagger/index.html#/Stable/get_faction_wars Torn API - Faction Members
     */
	async handle(client, war) {
        const config = getConfig();
        if(channel === null) channel = client.channels.cache.get(config.channels['war-log']);

        if (!channel) {
            logger.error('War logging channel not found - please check your config. (' + config.channels['war-log'] + ')');
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('War Declared')
            .setColor(0xAAFF33)
            .setDescription(`War between ${hyperlink(bold(war['factions'][0]['name']), `https://www.torn.com/factions.php?step=profile&ID=${war['factions'][0]['id'].toString()}`)} and ${hyperlink(bold(war['factions'][1]['name']), `https://www.torn.com/factions.php?step=profile&ID=${war['factions'][1]['id'].toString()}`)} has been declared.`)
            .addFields({'name': 'Start', 'value': time(war['start'])})
            .setFooter({
                text: `War ID: ${war['war_id']}`
            })
            .setTimestamp();

        //await channel.send({ embeds: [embed] });
	},
};