const { EmbedBuilder, Client, bold, hyperlink } = require('discord.js');
const { getConfig } = require('../../config');
const logger = require('../../logger');

module.exports = {
	event: 'torn-attack',
    once: false,

    /**
     * Handles the attacks event.
     * 
     * @param {Client} client Discord client.
     * @param {{
     * "id": Number,
     * "code": String,
     * "started": EpochTimeStamp,
     * "ended": EpochTimeStamp,
     * "attacker": {
     *   "id": Number,
     *   "name": String,
     *   "level": Number,
     *   "faction": {
     *     "id": Number,
     *     "name": String
     *   }
     * },
     * "defender": {
     *   "id": Number,
     *   "name": String,
     *   "level": Number,
     *   "faction": {
     *     "id": Number,
     *     "name": String
     *   }
     * },
     * "result": "None" | "Attacked" | "Mugged" | "Hospitalized" | "Arrested" | "Looted" | "Lost" | "Stalemate" | "Assist" | "Escape" | "Timeout" | "Special" | "Bounty" | "Interrupted",
     * "respect_gain": Number,
     * "respect_loss": Number,
     * "chain": Number,
     * "is_stealthed": Boolean,
     * "is_raid": Boolean,
     * "is_ranked_war": Boolean,
     * "modifiers": {
     *   "fair_fight": Number,
     *   "war": Number,
     *   "retaliation": Number,
     *   "group": Number,
     *   "overseas": Number,
     *   "chain": Number,
     *   "warlord": Number
     * }
     * }} attack Raw data from the Torn API.
     * 
     * @see https://www.torn.com/swagger/index.html#/Stable/get_faction_attacks Torn API - Attacks
     */
	async handle(client, attack) {
        const config = getConfig();
        const channel = client.channels.cache.get(config.channels['attack-log']);

        if (!channel) {
            logger.error('Attack logging channel not found - please check your config. (' + config.channels['attack-log'] + ')');
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(attack.is_ranked_war ? 0x00ff00 : 0x0000ff)
            .setTitle('Attack Log')
            .setDescription(`Temp.`)
            .addFields(
                { name: 'Duration', value: (attack.ended - attack.started).toString() + "s", inline: true },
                { name: 'Respect Gain', value: attack.respect_gain.toString(), inline: true },
                { name: 'Respect Loss', value: attack.respect_loss.toString(), inline: true },
                { name: 'Chain', value: "x"+attack.chain.toString(), inline: true },
                { name: 'Stealthed', value: attack.is_stealthed ? 'Yes' : 'No', inline: true },
                { name: 'Ranked War', value: attack.is_ranked_war ? 'Yes' : 'No', inline: true },
                { name: 'Result', value: attack.result, inline: true },
            )
            .setURL(`https://www.torn.com/loader.php?sid=attackLog&ID=${attack.code}`)
            .setTimestamp(attack.ended * 1000);

        let attacker = bold("Someone");
        let defender = bold("Someone");
        if (attack.attacker !== null) {
            attacker = bold(hyperlink(`${attack.attacker.name} (${attack.attacker.level.toString()})`, `https://www.torn.com/profiles.php?XID=${attack.attacker.id}`));
        }
        if (attack.defender !== null) {
            defender = bold(hyperlink(`${attack.defender.name} (${attack.defender.level.toString()})`, `https://www.torn.com/profiles.php?XID=${attack.defender.id}`));
        }
        embed.setDescription(`${attacker} attacked ${defender}.`)
        
        await channel.send({embeds: [embed]});
	},
};