const fs = require("fs");
const path = require("path");
const { logger } = require('../logger');

let commands = []

const foldersPath = __dirname;
const commandFolders = fs.readdirSync(foldersPath).filter(folder => fs.statSync(path.join(foldersPath, folder)).isDirectory());

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			commands.push(command);
            logger.debug(`Command '${command.data.name}' loaded.`, { path: filePath });
		} else {
			logger.error(`The command at ${filePath} is missing a required "data" or "execute" property.`);
		}

        delete filePath, command;
	}
}

delete foldersPath, commandFolders;

module.exports = commands;