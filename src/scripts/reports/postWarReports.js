const { getConfig } = require('../../config');
const { Client } = require('discord.js');
const logger = require('../../logger');
const fs = require('fs');

// Create reports directory if it doesn't exist
if (!fs.existsSync('data/reports/wars')) fs.mkdirSync('data/reports/wars', { recursive: true });

/**
 * @name warLosses
 * @description Generates a report of war losses by each member of the faction.
 * @param {Client} Discord client.
 * @param {[{
 * "id": Number,
 * "code": String,
 * "started": EpochTimeStamp,
 * "ended": EpochTimeStamp,
 * "attacker": {
 *   "id": Number,
 *   "name": String,
 *   "level": Number,
 *   "faction": {
 *     "id": Number,
 *     "name": String
 *   }
 * },
 * "defender": {
 *   "id": Number,
 *   "name": String,
 *   "level": Number,
 *   "faction": {
 *     "id": Number,
 *     "name": String
 *   }
 * },
 * "result": "None" | "Attacked" | "Mugged" | "Hospitalized" | "Arrested" | "Looted" | "Lost" | "Stalemate" | "Assist" | "Escape" | "Timeout" | "Special" | "Bounty" | "Interrupted",
 * "respect_gain": Number,
 * "respect_loss": Number,
 * "chain": Number,
 * "is_stealthed": Boolean,
 * "is_raid": Boolean,
 * "is_ranked_war": Boolean,
 * "modifiers": {
 *   "fair_fight": Number,
 *   "war": Number,
 *   "retaliation": Number,
 *   "group": Number,
 *   "overseas": Number,
 *   "chain": Number,
 *   "warlord": Number
 * }
 * }]} attacks Raw attack data from the war period.
 */
function warLosses(client, attacks) {
	
}

/**
 * 
 * @param {Client} client 
 * @param {{
 *  "war_id": Number,
 *  "start": EpochTimeStamp,
 *  "end": EpochTimeStamp,
 *  "target": Number,
 *  "winner": Number,
 *  "factions": [{
 *      "id": Number,
 *      "name": String,
 *      "score": Number,
 *      "chain": Number
 *  },
 *  {
 *      "id": Number,
 *      "name": String,
 *      "score": Number,
 *      "chain": Number
 *  }]
 * }} war Raw data from the Torn API.
 * @param {Boolean} [force=false] Whether to force overwrite existing reports for this war.
 */
function generateAllReports(client, war, force=false) {
    logger.info('Generating all post-war reports for war ID ' + war['war_id'] + ' (' + war['factions'][0]['name'] + ' vs ' + war['factions'][1]['name'] + ')');

    // Get all attacks during the war period
    
}

module.exports = generateAllReports;