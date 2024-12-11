const logger = require('../logger');
const { get_all_js_files } = require('../utils');
const { SlashCommandBuilder } = require("discord.js");

/**
 * @type {[{ data: SlashCommandBuilder, execute: Function }]}
 */
let commands = []

for(const file of get_all_js_files(__dirname)){
	if (file === __filename) continue;
	
	const command = require(file);
	// Set a new item in the Collection with the key as the command name and the value as the exported module
	if ('data' in command && 'execute' in command) {
		commands.push(command);
		logger.debug(`Command '${command.data.name}' loaded.`, { path: file });
	} else {
		logger.error(`The command at ${file} is missing a required "data" or "execute" property.`);
	}
}

module.exports = commands;