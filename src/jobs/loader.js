const fs = require("fs");
const path = require("path");
const logger = require('../logger');
const { get_all_js_files } = require("../utils");

/**
 * @type {[{ name: String, cron: String, execute: Function }]}
 */
let jobs = []

for (const filePath of get_all_js_files(__dirname)) {
	if (filePath === __filename) continue;
	const job = require(filePath);
	// Set a new item in the Collection with the key as the job name and the value as the exported module
	if ('name' in job && 'cron' in job && 'execute' in job) {
		jobs.push(job);
		logger.debug(`Scheduled Job '${job.name}' loaded.`, { path: filePath });
	} else {
		logger.error(`The scheduled job at ${filePath} is missing a required "name", "cron" or "execute" property.`);
	}
}

module.exports = jobs;