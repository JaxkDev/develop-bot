const { EmbedBuilder, Client, bold, hyperlink } = require('discord.js');
const { getConfig } = require('../../config');
const logger = require('../../logger');

module.exports = {
	event: 'torn-application',
    once: false,

    /**
     * Handles the member event.
     * 
     * @param {Client} client Discord client.
     * @param {{
     * "id": Number,
     * "user": {
     *      "id": Number,
     *      "name": String,
     *      "level": Number,
     *      "stats": {
     *          "strength": Number,
     *          "speed": Number,
     *          "dexterity": Number,
     *          "defense": Number
     *     }
     * },
     * "message": String,
     * "valid_until": EpochTimeStamp,
     * "status": "active" | "withdrawn" | "declined" | "accepted"
     * }} application Raw data from the Torn API.
     * @see https://www.torn.com/swagger/index.html#/Faction/get_faction_members Torn API - Faction Members
     */
	async handle(client, application) {
        const config = getConfig();
        const channel = client.channels.cache.get(config.channels['applications']);

        if (!channel) {
            logger.error('Applications channel not found - please check your config. (' + config.channels['applications'] + ')');
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(0x228855)
            .setTitle('Faction Application')
            //.setDescription(`${hyperlink(bold(application.user.name), `https://www.torn.com/profiles.php?XID=${application.user.id.toString()}`)} has applied!`)
            .addFields(
                { name: 'User', value: hyperlink(bold(application.user.name + ` [${application.user.id.toString()}]`), `https://www.torn.com/profiles.php?XID=${application.user.id.toString()}`) },
                { name: 'Message', value: application.message.length === 0 ? 'No message provided' : application.message, inline: false },
                { name: 'Level', value: application.user.level.toString(), inline: true },
                { name: 'Stats', value: `Str: ${application.user.stats.strength.toString()}\nSpd: ${application.user.stats.speed.toString()}\nDex: ${application.user.stats.dexterity.toString()}\nDef: ${application.user.stats.defense.toString()}`, inline: true },
                { name: 'Valid Until', value: new Date(application.valid_until * 1000).toLocaleString(), inline: false },
                { name: 'Application Status', value: application.status, inline: false }
            )
            .setTimestamp();

        await channel.send({embeds: [embed]});
	},
};