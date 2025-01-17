const { EmbedBuilder, Client, bold, hyperlink } = require('discord.js');
const { getConfig } = require('../../config');
const logger = require('../../logger');

const config = getConfig();
let channel = null;
let cache = {};

module.exports = {
	event: 'torn-member',
    once: false,

    /**
     * Handles the member event.
     * 
     * @param {Client} client Discord client.
     * @param {{
     * "id": Number,
     * "name": String,
     * "position": String,
     * "level": Number,
     * "days_in_faction": Number,
     * "is_revivable": Boolean,
     * "last_action": {
     *   "status": String,
     *   "timestamp": EpochTimeStamp,
     *   "relative": String
     * },
     * "status": {
     *   "description": String,
     *   "details": ?String,
     *   "state": String,
     *   "until": ?String
     * },
     * "life": {
     *   "current": Number,
     *   "maximum": Number
     * },
     * "revive_setting": "Everyone" | "Friends & Faction" | "No one" | "Unknown"
     * }} member Raw data from the Torn API.
     * 
     * @see https://www.torn.com/swagger/index.html#/Faction/get_faction_members Torn API - Faction Members
     */
	async handle(client, member) {
        if (process.env.ENVIRONMENT !== "dev") return;
        if(channel === null) channel = client.channels.cache.get(config.channels['member-status-log']);

        if (!channel) {
            logger.error('Member status logging channel not found - please check your config. (' + config.channels['member-status-log'] + ')');
            return;
        }

        // Check if the member is already in the cache
        if (cache[member.id] === undefined) {
            cache[member.id] = member;
            return;
        }

        let cached = cache[member.id];

        if (cached.level !== member.level){
            const embed = new EmbedBuilder()
                .setColor(0x228855)
                .setTitle('Level Up!')
                .setDescription(`${hyperlink(bold(member.name), `https://www.torn.com/profiles.php?XID=${member.id}`)} has leveled up to level ${bold(member.level)}!`)
                .setTimestamp();

            await channel.send({embeds: [embed]});
        }

        if (cached.position !== member.position){
            const embed = new EmbedBuilder()
                .setColor(0x8822ff)
                .setTitle('Position Change')
                .setDescription(`${hyperlink(bold(member.name), `https://www.torn.com/profiles.php?XID=${member.id}`)} has been promoted to ${bold(member.position)}!`)
                .setTimestamp();

            await channel.send({embeds: [embed]});
        }

        if (cached.revive_setting !== member.revive_setting){
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('Revive Setting Change')
                .setDescription(`${hyperlink(bold(member.name), `https://www.torn.com/profiles.php?XID=${member.id}`)} has changed their revive setting to ${bold(member.revive_setting)}!`)
                .setTimestamp();

            await channel.send({embeds: [embed]});
        }

        if (cached.status.state !== member.status.state){
            const embed = new EmbedBuilder()
                .setColor(member.status.state === 'Hospital' ? 0xFF0000 : (member.status.state === 'Okay' ? 0x00FF00 : 0x0000FF))
                .setTitle('Status Change')
                .setDescription(`${hyperlink(bold(member.name), `https://www.torn.com/profiles.php?XID=${member.id}`)} has changed status to ${bold(member.status.state)}!`)
                .setTimestamp();

            await channel.send({embeds: [embed]});
        }

        cache[member.id] = member;
	},
};