const fs = require("fs");
const path = require("path");
const logger = require('../logger');

let jobs = []

const foldersPath = __dirname;
const jobFolders = fs.readdirSync(foldersPath).filter(folder => fs.statSync(path.join(foldersPath, folder)).isDirectory());

for (const folder of jobFolders) {
	const jobsPath = path.join(foldersPath, folder);
	const jobFiles = fs.readdirSync(jobsPath).filter(file => file.endsWith('.js'));
	for (const file of jobFiles) {
		const filePath = path.join(jobsPath, file);
		const job = require(filePath);
		// Set a new item in the Collection with the key as the job name and the value as the exported module
		if ('name' in job && 'cron' in job && 'execute' in job) {
			jobs.push(job);
            logger.debug(`Scheduled Job '${job.name}' loaded.`, { path: filePath });
		} else {
			logger.error(`The scheduled job at ${filePath} is missing a required "name", "cron" or "execute" property.`);
		}

        delete filePath, job;
	}
}

delete foldersPath, jobFolders;

module.exports = jobs;