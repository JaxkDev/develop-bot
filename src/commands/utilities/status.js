const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { getConfig } = require('../../config');
const { format_uptime, format_bytes } = require('../../utils');
const { logger } = require('../../logger');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('status')
		.setDescription('View the current status of the bots operations.'),
	async execute(interaction) {
        let uptime = format_uptime(process.uptime());
        let memoryUsage = format_bytes(process.memoryUsage().rss);

        //check if process.env.version exists if not set it to the package.json version
        if (!process.env.version) {
            process.env.version = require('../../../package.json').version;
            if (getConfig().debug || process.env.ENVIRONMENT === 'dev') {
                process.env.version += '+dev[' + require('child_process').execSync('git rev-parse --short HEAD').toString().trim() + ']';
            }
            logger.debug('Version not found in environment variables, setting it to ' + process.env.version);
        }

        const exampleEmbed = new EmbedBuilder()
            .setColor(0x22FF22)
            .setTitle('System Status - __**Fully Operational**__')
            .setDescription('‎')
            .setTimestamp()
            .addFields(
                //{ name: 'Status', value: "🆗 - Fully Operational", inline: false },
                { name: 'Uptime', value: uptime, inline: true },
                { name: 'Memory Usage', value: memoryUsage, inline: true },
                { name: 'Version', value: process.env.version+'\n‎', inline: true },
                { name: 'Guilds', value: interaction.client.guilds.cache.size.toString(), inline: true },
                { name: 'Users', value: interaction.client.users.cache.size.toString(), inline: true },
                { name: 'Commands', value: interaction.client.commands.size.toString(), inline: true },
            )
            //.setFooter({ text: "Requested by " + interaction.user.displayName, iconURL: interaction.user.avatarURL() })
            //.setThumbnail(interaction.client.user.displayAvatarURL());
        
        await interaction.reply({ embeds: [exampleEmbed] });
	},
};