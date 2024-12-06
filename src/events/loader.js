const fs = require("fs");
const path = require("path");
const logger = require('../logger');

/**
 * @type {[{ event: string, once: boolean, handle: Function }]}
 */
let events = []

const foldersPath = __dirname;
const eventFolders = fs.readdirSync(foldersPath).filter(folder => fs.statSync(path.join(foldersPath, folder)).isDirectory());

for (const folder of eventFolders) {
	const eventsPath = path.join(foldersPath, folder);
	const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
	for (const file of eventFiles) {
		const filePath = path.join(eventsPath, file);
		const event = require(filePath);
		// Set a new item in the Collection with the key as the event name and the value as the exported module
		if ('event' in event && 'once' in event && 'handle' in event) {
			events.push(event);
            logger.debug(`event '${event.event}' loaded.`, { path: filePath });
		} else {
			logger.error(`The event at ${filePath} is missing a required "data", "once" or "handle" property.`);
		}

        delete filePath, event;
	}
}

delete foldersPath, eventFolders;

module.exports = events;