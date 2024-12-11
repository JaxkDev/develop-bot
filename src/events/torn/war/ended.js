const { EmbedBuilder, Client, bold, hyperlink, time} = require('discord.js');
const { getConfig } = require('../../../config');
const logger = require('../../../logger');

let channel = null;

module.exports = {
	event: 'torn-war-end',
    once: false,

    /**
     * Handles the war end event.
     * 
     * @param {Client} client Discord client.
     * @param {{
     *  "war_id": Number,
     *  "start": EpochTimeStamp,
     *  "end": EpochTimeStamp,
     *  "target": Number,
     *  "winner": Number,
     *  "factions": [{
     *      "id": Number,
     *      "name": String,
     *      "score": Number,
     *      "chain": 0
     *  },
     *  {
     *      "id": Number,
     *      "name": String,
     *      "score": Number,
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

        // Who won the war (highest score)
        const winner = war['factions'].reduce((a, b) => a.score > b.score ? a : b);

        const embed = new EmbedBuilder()
            .setTitle('War Ended - ' + (winner.id === config.faction ? 'Victory!' : 'Defeat!'))
            .setColor(winner.id !== config.faction ? 0xFF0000 : 0x00FF00)
            .setDescription(`War between ${hyperlink(bold(war['factions'][0]['name']), `https://www.torn.com/factions.php?step=profile&ID=${war['factions'][0]['id'].toString()}`)} and ${hyperlink(bold(war['factions'][1]['name']), `https://www.torn.com/factions.php?step=profile&ID=${war['factions'][1]['id'].toString()}`)} has ended!`)
            .setFields(
                { name: 'Winner', value: bold(winner.name) },
                { name: 'Score', value: `${war['factions'][0]['score']} - ${war['factions'][1]['score']}` },
                //{ name: 'Start', value: time(war['start']) },
                //{ name: 'End', value: time(war['end']) }
            )
            .setFooter({
                text: `War ID: ${war['war_id']}`
            })
            .setTimestamp();

        await channel.send({ embeds: [embed] });
	},
};