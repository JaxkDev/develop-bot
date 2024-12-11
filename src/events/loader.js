const logger = require('../logger');
const { get_all_js_files } = require('../utils');

/**
 * @type {[{ event: string, once: boolean, handle: Function }]}
 */
let events = []

for (const filePath of get_all_js_files(__dirname)) {
	if (filePath === __filename) continue;

    const event = require(filePath);
    // Set a new item in the Collection with the key as the event name and the value as the exported module
    if ('event' in event && 'once' in event && 'handle' in event) {
        events.push(event);
        logger.debug(`Event '${event.event}' loaded.`, { path: filePath });
    } else {
        logger.error(`The event at ${filePath} is missing a required "event", "once" or "handle" property.`);
    }
}

module.exports = events;