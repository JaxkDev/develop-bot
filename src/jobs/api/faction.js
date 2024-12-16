const { getConfig } = require('../../config');
const axios = require('axios');
const logger = require('../../logger');
const fs = require('fs');
const { Client } = require('discord.js');

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
const interval = 3; // seconds (max 59, see cron syntax)
const url = `${getConfig().api}/faction?key=${process.env.TORN_KEY}&selections=` + faction_selections.join(',');

if (!fs.existsSync('data/api/faction/attacks')) fs.mkdirSync('data/api/faction/attacks', { recursive: true });
if (!fs.existsSync('data/api/faction/wars')) fs.mkdirSync('data/api/faction/wars', { recursive: true });
if (!fs.existsSync('data/api/faction/raw')) fs.mkdirSync('data/api/faction/raw', { recursive: true });

let cache = {
	"init": false, // This is to check if the cache is initialized, once true all data is current.
	"timestamp": 0,
	"war": {},
	"attacks": []
};
let data = JSON.parse(fs.existsSync('data/api/faction/cache.dat') ? fs.readFileSync('data/api/faction/cache.dat', 'utf8') : JSON.stringify(cache));
if (Object.keys(data).length === Object.keys(cache).length) cache = data;
cache['init'] = false;


// Run this every 3s
module.exports = {
	name: 'ApiFaction',
    cron: '*/' + interval.toString() + ' * * * * *',

	/**
	 * @param {Client} client 
	 */
	async execute(client) {
		const lastTimestamp = cache.timestamp;
		axios.get(url + `&from=${lastTimestamp}`)
		.then(res => {
			if(res.status !== 200) {
				throw new Error('Failed to fetch data from Torn API');
			}

			const data = res.data;
			const timestamp = data.timestamp;
			logger.debug(`Faction data fetched with timestamp ${timestamp}`);
			cache.timestamp = timestamp;

			// Global torn data.
			client.torn_data = data;

			//// -- MEMBERS -- ////
			for (const member of data.members ?? []) {
				client.emit('torn-member', member);
			}

			//// -- ATTACKS -- ////
			const attacks = data.attacks ?? [];
			for (const attack of attacks.reverse()) {
				const attackId = attack.id;
				// Check if the attack is already processed
				if (cache.attacks.includes(attackId)) {
					logger.debug(`Faction attack data for attack ID ${attackId} is already processed.`);
					continue;
				}

				client.emit('torn-attack', attack);
				logger.debug(`Faction attack data emitted for attack ID ${attackId}`);

				if (process.env.ENVIRONMENT !== "prod") fs.writeFile(`data/api/faction/attacks/${attack.ended}-${attackId}.dat`, JSON.stringify(attack), (err) => {if(err) logger.error(`Failed to write attack data for attack ID ${attackId}`, {error: err})});
			}
			// replace cache with new data
			cache.attacks = attacks.map(attack => attack.id);

			//// -- WARS -- ////
			let war = data.wars.ranked;
			if (war !== null) {
				const warId = war.war_id;

				// Check if the war is new information
				if ((cache.war.war_id??0) !== warId) {
					client.emit('torn-war-chosen', war);
					logger.debug(`Faction war chosen data emitted for war ID ${warId}`);
				} else if (war.start > lastTimestamp && war.start <= timestamp) {
					logger.warn("debug data here", {war, lastTimestamp, timestamp});
					client.emit('torn-war-start', war);
					logger.debug(`Faction war start data emitted for war ID ${warId}`);
				} else if (cache.war.end !== war.end) {
					client.emit('torn-war-end', war);
					logger.debug(`Faction war end data emitted for war ID ${warId}`);
				}

				cache.war = war;
			} else {
				cache.war = {};
			}



			cache.init = true;
			fs.writeFile('data/api/faction/cache.dat', JSON.stringify(cache), (err) => {if(err) logger.error(`Failed to write cache data`, {error: err})});
		})
		.catch(err => {
			logger.error("Failed to fetch faction data from Torn API", {error: err.toString()});
		});
	},
};