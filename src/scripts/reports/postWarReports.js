const { getConfig } = require('../../config');
const { Client, userMention, bold, underline } = require('discord.js');
const logger = require('../../logger');
const axios = require('axios');
const fs = require('fs');

/**
 * 
 * @param {Client} client Discord client.
 * @param {EpochTimeStamp} start Start timestamp of the war.
 * @param {EpochTimeStamp} end End timestamp of the war.
 * @returns {Promise<[{
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
 * }]>} Promise containing all attacks during the war period.
 */
function getAllAttacks(client, start, end) {
    const config = getConfig();
    return new Promise(async (resolve, reject) =>{
        // Get all attacks
        let url = config['api'] + '/faction?selections=attacks&from=' + start.toString() + '&to=' + end.toString();
        let length = 100;
        let attacks = new Map();
        while(length === 100) {
            logger.debug('Fetching attacks from ' + url);
            url += '&key=' + process.env.TORN_KEY;
            try {
                const response = await axios.get(url);
                if (response.status !== 200) {
                    logger.error('Failed to get attacks: HTTP-' + response.status.toString());
                    reject('Failed to get all attacks: HTTP-' + response.status.toString());
                    return;
                }
                const data = response.data['attacks'] ?? [];
                if (data.length === 0) {
                    resolve(attacks);
                    return;
                }
                length = data.length;
                url = response.data["_metadata"]["links"]["prev"];

                for (const attack of data) {
                    attacks.set(attack['id'], attack);
                }
            } catch (err) {
                logger.error('Failed to get attacks: ' + err, { error: err.toString() });
                reject(err);
            };
        }
        attacks = Array.from(attacks.values());
        logger.info('Got all ' + attacks.length.toString() + ' attacks during the war period ' + start.toString() + ' to ' + end.toString());
        resolve(attacks);
    });
}

/**
 * @name FiveHundredLimitReport
 * @description Generates a report of attacks and any voided attacks (after 500 score)
 * @param {Client} Discord client.
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
* }} war War data from the Torn API.
* @param {[{
*  "id": Number,
*  "code": String,
*  "started": EpochTimeStamp,
*  "ended": EpochTimeStamp,
*  "attacker": {
*    "id": Number,
*    "name": String,
*    "level": Number,
*    "faction": {
*      "id": Number,
*      "name": String
*    }
*  } | null,
*  "defender": {
*    "id": Number,
*    "name": String,
*    "level": Number,
*    "faction": {
*      "id": Number,
*      "name": String
*    }
*  },
*  "result": "None" | "Attacked" | "Mugged" | "Hospitalized" | "Arrested" | "Looted" | "Lost" | "Stalemate" | "Assist" | "Escape" | "Timeout" | "Special" | "Bounty" | "Interrupted",
*  "respect_gain": Number,
*  "respect_loss": Number,
*  "chain": Number,
*  "is_stealthed": Boolean,
*  "is_raid": Boolean,
*  "is_ranked_war": Boolean,
*  "modifiers": {
*    "fair_fight": Number,
*    "war": Number,
*    "retaliation": Number,
*    "group": Number,
*    "overseas": Number,
*    "chain": Number,
*    "warlord": Number
*  }
* }]} attacks Raw attack data from the war period.
* @param {Boolean} [force=false] Whether to force overwrite existing reports for this war.
*/
function FiveHundredLimitReport(client, war, attacks, force=false) {
    const config = getConfig();
    const war_id = war['war_id'];

    if (!force) {
        // Check if the report already exists
        if (fs.existsSync(`data/reports/wars/${war_id.toString()}/500_limit_report.json`)) {
            logger.warn('500 limit report already exists for war ID ' + war_id.toString() + '.');
            return;
        }
    }

    // Filter out only ranked wars successful attacks.
    let filtered = attacks.filter(
        attack => attack['is_ranked_war'] === true && (attack['result'] === 'Attacked' || attack['result'] === 'Mugged' || attack['result'] === 'Hospitalized')
    );

    // Generate report
    let report = {
            "war_id": war_id,
            "timestamps": {
                "start": war['start'] * 1000,
                "end": war['end'] * 1000,
                "report_generated": Date.now(),
                "500_achieved_human": "",
                "500_achieved": 0
            },
            "factions": war['factions'],
            "members": {}
    };

    let score = 0;
    let last = filtered[0];
    for (const attack of filtered) {
        const member = ((attack['defender']['faction']['id'] === config['faction']) ? 'defender' : 'attacker');

        if (!(attack[member]['id'] in report['members'])) {
            report['members'][attack[member]['id']] = {
                "name": attack[member]['name'],
                "level": attack[member]['level'],
                "attacks": 0,
                "attacks_voided": 0,
                "attacks_total": 0,
            };
        }

        if (member === 'attacker') {
            if (last['started'] !== attack['started']) {
                if (last['started'] >= attack['started']) {
                    logger.error('NOT SORTED: Last attack started at ' + last['started'] + ' and current attack started at ' + attack['started']);
                    // NOT SORTED
                }
                last = attack;
            }
            if (score < 500) {
                report['members'][attack[member]['id']]['attacks'] += 1;
            } else {
                report['members'][attack[member]['id']]['attacks_voided'] += 1;
            }
            report['members'][attack[member]['id']]['attacks_total'] += 1;

            score += attack['respect_gain'];
            if (score >= 500 && score-attack['respect_gain'] < 500) {
                report['timestamps']['500_achieved'] = attack['ended'];
                report['timestamps']['500_achieved_human'] = new Date(attack['ended'] * 1000).toString();
            }
        }
    }

    // Save report to file
    fs.writeFileSync(`data/reports/wars/${war_id.toString()}/500_limit_report.json`, JSON.stringify(report, null, 2));
    logger.info('Saved 500 limit report to file for war ID ' + war_id.toString() + ' - data/reports/wars/' + war_id.toString() + '/500_limit_report.json');

    // Send report to Discord
    const channel = client.channels.cache.get(config['channels']['war-log']);
    if (channel) channel.send({ content: bold(underline('500 limit report for war ID ' + war_id.toString())), files: [{ attachment: `data/reports/wars/${war_id.toString()}/500_limit_report.json`, name: '500_limit_report.json' }] });
    else logger.warn('Failed to send 500 limit report for war ID ' + war_id.toString() + ' - channel not found.');
}

/**
 * @name netReport
 * @description Generates a report of net gains/losses.
 * @param {Client} Discord client.
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
* }} war War data from the Torn API.
* @param {[{
*  "id": Number,
*  "code": String,
*  "started": EpochTimeStamp,
*  "ended": EpochTimeStamp,
*  "attacker": {
*    "id": Number,
*    "name": String,
*    "level": Number,
*    "faction": {
*      "id": Number,
*      "name": String
*    }
*  } | null,
*  "defender": {
*    "id": Number,
*    "name": String,
*    "level": Number,
*    "faction": {
*      "id": Number,
*      "name": String
*    }
*  },
*  "result": "None" | "Attacked" | "Mugged" | "Hospitalized" | "Arrested" | "Looted" | "Lost" | "Stalemate" | "Assist" | "Escape" | "Timeout" | "Special" | "Bounty" | "Interrupted",
*  "respect_gain": Number,
*  "respect_loss": Number,
*  "chain": Number,
*  "is_stealthed": Boolean,
*  "is_raid": Boolean,
*  "is_ranked_war": Boolean,
*  "modifiers": {
*    "fair_fight": Number,
*    "war": Number,
*    "retaliation": Number,
*    "group": Number,
*    "overseas": Number,
*    "chain": Number,
*    "warlord": Number
*  }
* }]} attacks Raw attack data from the war period.
* @param {Boolean} [force=false] Whether to force overwrite existing reports for this war.
*/
function netReport(client, war, attacks, force=false) {
    const config = getConfig();
    const war_id = war['war_id'];

    if (!force) {
        // Check if the report already exists
        if (fs.existsSync(`data/reports/wars/${war_id.toString()}/net_attacks.json`)) {
            logger.warn('Net attacks report already exists for war ID ' + war_id.toString() + '.');
            return;
        }
    }

    // Filter out only ranked wars successful attacks.
    let filtered = attacks.filter(
        attack => attack['is_ranked_war'] === true && (attack['result'] === 'Attacked' || attack['result'] === 'Mugged' || attack['result'] === 'Hospitalized')
    );

    // Generate report
    let report = {
            "war_id": war_id,
            "timestamps": {
                "start": war['start'] * 1000,
                "end": war['end'] * 1000,
                "report_generated": Date.now()
            },
            "factions": war['factions'],
            "members": {}
    };

    for (const attack of filtered) {
        const member = ((attack['defender']['faction']['id'] === config['faction']) ? 'defender' : 'attacker');

        if (!(attack[member]['id'] in report['members'])) {
            report['members'][attack[member]['id']] = {
                "name": attack[member]['name'],
                "level": attack[member]['level'],
                "attacks": 0,
                "respect_we_gained": 0,
                "losses": 0,
                "respect_they_gained": 0,
                "net_attacks": 0,
                "net_respect_gained": 0,
            };
        }

        if (member === 'defender') {
            report['members'][attack[member]['id']]['losses'] += 1;
            report['members'][attack[member]['id']]['respect_they_gained'] += attack['respect_gain'];
        } else {
            report['members'][attack[member]['id']]['attacks'] += 1;
            report['members'][attack[member]['id']]['respect_we_gained'] += attack['respect_gain'];
        }
    }

    // Round respect gained to 2 decimal places
    for (const member in report['members']) {
        report['members'][member]['respect_we_gained'] = Math.round(report['members'][member]['respect_we_gained'] * 100) / 100;
        report['members'][member]['respect_they_gained'] = Math.round(report['members'][member]['respect_they_gained'] * 100) / 100;
        report['members'][member]['net_respect_gained'] = Math.round((report['members'][member]['respect_we_gained'] - report['members'][member]['respect_they_gained']) * 100) / 100;
        report['members'][member]['net_attacks'] = report['members'][member]['attacks'] - report['members'][member]['losses'];
    }

    // Save report to file
    fs.writeFileSync(`data/reports/wars/${war_id.toString()}/net_report.json`, JSON.stringify(report, null, 2));
    logger.info('Saved net attacks report to file for war ID ' + war_id.toString() + ' - data/reports/wars/' + war_id.toString() + '/net_report.json');

    // Send report to Discord
    const channel = client.channels.cache.get(config['channels']['war-log']);
    if (channel) channel.send({ content: bold(underline('Net attacks report for war ID ' + war_id.toString())), files: [{ attachment: `data/reports/wars/${war_id.toString()}/net_report.json`, name: 'net_report.json' }] });
    else logger.warn('Failed to send net attacks report for war ID ' + war_id.toString() + ' - channel not found.');
}

/**
 * @name lossesReport
 * @description Generates a report of war losses by each member of the faction.
 * @param {Client} Discord client.
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
 * }} war War data from the Torn API.
 * @param {[{
 *  "id": Number,
 *  "code": String,
 *  "started": EpochTimeStamp,
 *  "ended": EpochTimeStamp,
 *  "attacker": {
 *    "id": Number,
 *    "name": String,
 *    "level": Number,
 *    "faction": {
 *      "id": Number,
 *      "name": String
 *    }
 *  } | null,
 *  "defender": {
 *    "id": Number,
 *    "name": String,
 *    "level": Number,
 *    "faction": {
 *      "id": Number,
 *      "name": String
 *    }
 *  },
 *  "result": "None" | "Attacked" | "Mugged" | "Hospitalized" | "Arrested" | "Looted" | "Lost" | "Stalemate" | "Assist" | "Escape" | "Timeout" | "Special" | "Bounty" | "Interrupted",
 *  "respect_gain": Number,
 *  "respect_loss": Number,
 *  "chain": Number,
 *  "is_stealthed": Boolean,
 *  "is_raid": Boolean,
 *  "is_ranked_war": Boolean,
 *  "modifiers": {
 *    "fair_fight": Number,
 *    "war": Number,
 *    "retaliation": Number,
 *    "group": Number,
 *    "overseas": Number,
 *    "chain": Number,
 *    "warlord": Number
 *  }
 * }]} attacks Raw attack data from the war period.
 * @param {Boolean} [force=false] Whether to force overwrite existing reports for this war.
*/
function lossesReport(client, war, attacks, force=false) {
    const config = getConfig();
    const war_id = war['war_id'];

    if (!force) {
        // Check if the report already exists
        if (fs.existsSync(`data/reports/wars/${war_id.toString()}/defends.json`)) {
            logger.warn('War losses report already exists for war ID ' + war_id.toString() + '.');
            return;
        }
    }

    // Filter out only ranked wars and losses by the faction
    let filtered = attacks.filter(
        attack => attack['is_ranked_war'] === true &&
        attack["defender"]["faction"]["id"] === config['faction']
    );

    // Save filtered losses to file
    fs.writeFileSync(`data/reports/wars/${war_id.toString()}/defends.json`, JSON.stringify(filtered, null, 2));
    logger.info('Saved all defends during the war period to file for faction ' + config['faction'] + ' - data/reports/wars/' + war_id.toString() + '/defends.json');

    // Generate report
    let report = {
            "war_id": war_id,
            "timestamps": {
                "start": war['start'] * 1000,
                "end": war['end'] * 1000,
                "report_generated": Date.now()
            },
            "factions": war['factions'],
            "members": {}
    };

    for (const attack of filtered) {
        if (!(attack['defender']['id'] in report['members'])) {
            report['members'][attack['defender']['id']] = {
                "name": attack['defender']['name'],
                "level": attack['defender']['level'],
                "losses": 0,
                "respect_they_gained": 0,
                "types": {
                    "attacked": 0,
                    "mugged": 0,
                    "hospitalized": 0,
                    "other": 0
                }
            };
        }
        report['members'][attack['defender']['id']]['losses'] += 1;
        report['members'][attack['defender']['id']]['respect_they_gained'] += attack['respect_gain'];
        switch (attack['result'].toLowerCase()) {
            case 'attacked':
                report['members'][attack['defender']['id']]['types']['attacked'] += 1;
                break;
            case 'mugged':
                report['members'][attack['defender']['id']]['types']['mugged'] += 1;
                break;
            case 'hospitalized':
                report['members'][attack['defender']['id']]['types']['hospitalized'] += 1;
                break;
            default:
                report['members'][attack['defender']['id']]['types']['other'] += 1;
        }
    }

    // Round respect gained to 2 decimal places
    for (const member in report['members']) {
        report['members'][member]['respect_they_gained'] = Math.round(report['members'][member]['respect_they_gained'] * 100) / 100;
    }

    // Sort members by respect gained
    //report['members'] = Object.fromEntries(Object.entries(report['members']).sort((a, b) => b[1]['losses'] - a[1]['losses']))

    // Save report to file
    fs.writeFileSync(`data/reports/wars/${war_id.toString()}/losses.json`, JSON.stringify(report, null, 2));
    logger.info('Saved war losses report to file for war ID ' + war_id.toString() + ' - data/reports/wars/' + war_id.toString() + '/losses.json');

    // Send report to Discord
    const channel = client.channels.cache.get(config['channels']['war-log']);
    if (channel) channel.send({ content: bold(underline('War losses report for war ID ' + war_id.toString())), files: [{ attachment: `data/reports/wars/${war_id.toString()}/losses.json`, name: 'losses.json' }] });
    else logger.warn('Failed to send war losses report for war ID ' + war_id.toString() + ' - channel not found.');
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
async function generateAllReports(client, war, force=false) {
    logger.info('Generating all post-war reports for war ID ' + war['war_id'] + ' (' + war['factions'][0]['name'] + ' vs ' + war['factions'][1]['name'] + ')');
    if (!fs.existsSync(`data/reports/wars/${war['war_id']}`)) fs.mkdirSync(`data/reports/wars/${war['war_id']}`, { recursive: true });

    const config = getConfig();
    const warStart = war['start'];
    const warEnd = war['end'];
    let attacks = [];

    // Get all attacks during the war period
    try {
        if (fs.existsSync(`data/reports/wars/${war['war_id']}/attacks_raw.json`) && !force) {
            logger.warn('All attacks during the war period already exist for war ID ' + war['war_id'] + '.');
            attacks = JSON.parse(fs.readFileSync(`data/reports/wars/${war['war_id']}/attacks_raw.json`));
        } else {
            attacks = await getAllAttacks(client, warStart, warEnd);
            // Save all attacks to file
            fs.writeFileSync(`data/reports/wars/${war['war_id']}/attacks_raw.json`, JSON.stringify(attacks, null, 2));
            logger.info('Saved all attacks during the war period to file for war ID ' + war['war_id'] + ' - data/reports/wars/' + war['war_id'] + '/attacks_raw.json');
        }
    } catch(err) {
        logger.error('Failed to get all attacks for war ID ' + war['war_id'], { error: err.toString() });
        const channel = client.channels.cache.get(config['channels']['war-log']);
        if (channel) channel.send({ content: 'Failed to generate post-war reports for war ID ' + war['war_id'] + ' ' + userMention(config['owner_id']) + '.' });
        return;
    };

    // Generate war losses report
    try {
        lossesReport(client, war, attacks, force);
    } catch(err) {
        logger.error('Failed to generate war losses report for war ID ' + war['war_id'], { error: err.toString() });
        const channel = client.channels.cache.get(config['channels']['war-log']);
        if (channel) channel.send({ content: 'Failed to generate war losses report for war ID ' + war['war_id'] + ' ' + userMention(config['owner_id']) + '.' });
    }

    // Generate net attacks report
    try {
        netReport(client, war, attacks, force);
    } catch(err) {
        logger.error('Failed to generate net attacks report for war ID ' + war['war_id'], { error: err.toString() });
        const channel = client.channels.cache.get(config['channels']['war-log']);
        if (channel) channel.send({ content: 'Failed to generate net attacks report for war ID ' + war['war_id'] + ' ' + userMention(config['owner_id']) + '.' });
    }

    // Other reports.

    if (war.winner === config.faction) {
        logger.debug('Generating Won reports for war ID ' + war['war_id']);
        // Won
    } else {
        logger.debug('Generating Lost reports for war ID ' + war['war_id']);
        // Lost
        try {
            FiveHundredLimitReport(client, war, attacks, force);
        } catch(err) {
            logger.error('Failed to generate 500 limit report for war ID ' + war['war_id'], { error: err.toString() });
            const channel = client.channels.cache.get(config['channels']['war-log']);
            if (channel) channel.send({ content: 'Failed to generate 500 attack limit report for war ID ' + war['war_id'] + ' ' + userMention(config['owner_id']) + '.' });
        }
    }
}

module.exports = generateAllReports;