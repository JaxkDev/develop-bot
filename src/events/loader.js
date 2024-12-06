const fs = require("fs");
const path = require("path");
const logger = require('../logger');

let events = []

const foldersPath = __dirname;
const eventFiles = fs.readdirSync(foldersPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    if (file === 'loader.js') continue;
	const filePath = path.join(foldersPath, file);
    const event = require(filePath);
    if ('name' in event && 'once' in event && typeof event.once === "boolean" && 'execute' in event && typeof event.execute === 'function') {
        events.push(event);
        logger.debug(`Event '${event.name}' loaded.`, { path: filePath });
    } else {
        logger.error(`The event at ${filePath} is missing a required "name", "once" or "execute" property.`);
    }

    delete filePath, event;
}

delete foldersPath, eventFiles;

module.exports = events;