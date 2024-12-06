const { getConfig } = require('../../config');
const axios = require('axios');
const logger = require('../../logger');
const fs = require('fs');
const { Client } = require('discord.js');
const { log } = require('console');

const faction_selections = [
	'basic',
	'chainreport',
	'chain',
	'territory',
	'rankedwars',
	'timestamp',
	'chains',
	'members',
	'wars',
	'applications', //TODO Check this when there is actually an application
	'armor',
	'boosters',
	'crimes',
	'drugs',
	'medical',
	'revives',
	'revivesfull', //TODO Check if this is needed if its like attacksfull, definitely not needed
	'stats',
	'temporary',
	'upgrades',
	'weapons',
	'caches',
	'crimeexp',
	'attacks',
	//'attacksfull', // This is a lot of useless data more detailed is 'attacks' selection
	'cesium',
	'contributors',
	'currency',
	'donations',
	'reports'
]

// Run this every 30s
module.exports = {
	name: 'ApiFaction',
    cron: '*/30 * * * * *',
	/**
	 * @param {Client} client 
	 */
	async execute(client) {
        logger.debug('Fetching faction data from Torn API');
		if (!fs.existsSync('data/api/faction')) fs.mkdirSync('data/api/faction', { recursive: true });
		const meta = JSON.parse(fs.existsSync('data/api/faction/meta.dat') ? fs.readFileSync('data/api/faction/meta.dat', 'utf8') : '{}');
		const lastTimestamp = meta.timestamp || 0;

		const url = `${getConfig().api}/faction?key=${process.env.TORN_KEY}&from=${lastTimestamp}&selections=` + faction_selections.join(',');
		axios.get(url)
		.then(res => {
			if(res.status !== 200) {
				throw new Error('Failed to fetch data from Torn API');
			}

			const data = res.data;
			const timestamp = data.timestamp;
			logger.debug(`Faction data fetched with timestamp ${timestamp}`);
			fs.writeFileSync('data/api/faction/meta.dat', JSON.stringify({ timestamp: timestamp }));

			const attacks = data.attacks ?? [];
			for (const attack of attacks.reverse()) {
				const attackId = attack.id;
				client.emit('torn-attack', attack);
				logger.debug(`Faction attack data emitted for attack ID ${attackId}`);
				//logger.debug(`Faction attack data emitted for attack ID ${attackId}`);
				//fs.writeFileSync(`data/api/faction/attacks-${attackId}.dat`, JSON.stringify(attack));
				//logger.debug(`Faction attack data saved for attack ID ${attackId} to ${`data/api/faction/attacks-${attackId}.dat`}`);
			}
		})
		.catch(err => {
			logger.error("Failed to fetch faction data from Torn API", {error: err});
		});
	},
};