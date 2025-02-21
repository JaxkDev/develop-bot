const { getConfig } = require('../../config');
const { Client, userMention, bold, underline, hyperlink } = require('discord.js');
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
        attacks = Array.from(attacks.values()).reverse();
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
async function FiveHundredLimitReport(client, war, attacks, force=false) {
    const config = getConfig();
    const war_id = war['war_id'];

    if (!force) {
        // Check if the report already exists
        if (fs.existsSync(`data/reports/wars/${war_id.toString()}/500_limit_report.json`)) {
            logger.warn('500 limit report already exists for war ID ' + war_id.toString() + '.');
            return;
        }
    }

    let winner = war['factions'][0]['id'] === war['winner'] ? war['factions'][0]['name'] : war['factions'][1]['name'];

    const description = `
This report contains the attacks that were made during the war period that resulted in the faction reaching the 500 respect limit,
and any attacks that were finished after the limit was reached have been voided.

Note, this report only contains ranked wars and successful attacks on the faction and does not include any incomplete/failed attacks.

War: ${war_id} [${war['factions'][0]['name']} vs ${war['factions'][1]['name']}]
Score: ${war['factions'][0]['score']} - ${war['factions'][1]['score']}
Winner: ${winner}

500 Respect limit reached at: {{500_achieved_human}} [{{500_achieved}}]

War start time: ${new Date(war['start'] * 1000).toString()}
War end end: ${new Date(war['end'] * 1000).toString()}
`;

    const name = war_id.toString() + ' - War 500 limit report';
    const category = 1;
    let data = [];

    // Filter out only ranked wars successful attacks.
    let filtered = attacks.filter(
        attack => attack['is_ranked_war'] === true && (attack['result'] === 'Attacked' || attack['result'] === 'Mugged' || attack['result'] === 'Hospitalized')
    );

    // Generate report
    let members = {};

    let score = 0;
    let last = filtered[0];
    for (const attack of filtered) {
        const member = ((attack['defender']['faction']['id'] === config['faction']) ? 'defender' : 'attacker');

        if (!(attack[member]['id'] in members)) {
            members[attack[member]['id']] = {
                "name": attack[member]['name'],
                "level": attack[member]['level'],
                "attacks": 0,
                "attacks_voided": 0,
                "attacks_total": 0,
            };
        }

        if (member === 'attacker') {
            if (last['ended'] !== attack['ended']) {
                if (last['ended'] >= attack['ended']) {
                    logger.error('NOT SORTED: Last attack ended at ' + last['ended'] + ' and current attack ended at ' + attack['ended']);
                    // NOT SORTED, SHOULD NOT HAPPEN, IF HAPPENS, API HAS CHANGED AND THIS CODE NEEDS TO BE UPDATED ASAP.
                }
                last = attack;
            }
            if (score < 500) {
                members[attack[member]['id']]['attacks'] += 1;
            } else {
                members[attack[member]['id']]['attacks_voided'] += 1;
            }
            members[attack[member]['id']]['attacks_total'] += 1;

            score += attack['respect_gain'];
            if (score >= 500 && score-attack['respect_gain'] < 500) {
                description.replace('{{500_achieved_human}}', new Date(attack['ended'] * 1000).toString());
                description.replace('{{500_achieved}}', attack['ended'].toString());
            }
        }
    }

    for (const member in members) {
        data.push({
            "ID": member,
            "Name": members[member]['name'],
            "Level": members[member]['level'],
            "Attacks": members[member]['attacks'],
            "Attacks Voided": members[member]['attacks_voided'],
            "Total Attacks": members[member]['attacks_total']
        });
    }

    // Save report to file
    fs.writeFileSync(`data/reports/wars/${war_id.toString()}/500_limit_report.json`, JSON.stringify(data, null, 2));
    logger.info('Saved 500 limit report to file for war ID ' + war_id.toString() + ' - data/reports/wars/' + war_id.toString() + '/500_limit_report.json');

    // Send report to Web server
    const url = await sendReport({ name, description, category, data });

    // Send report to Discord
    const channel = client.channels.cache.get(config['channels']['war-log']);
    if (channel) channel.send({ content: bold(underline('500 limit report for war ID ' + war_id.toString())+'\n\n'+hyperlink('View report on dashboard', url))});
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
async function netReport(client, war, attacks, force=false) {
    const config = getConfig();
    const war_id = war['war_id'];

    if (!force) {
        // Check if the report already exists
        if (fs.existsSync(`data/reports/wars/${war_id.toString()}/net_attacks.json`)) {
            logger.warn('Net attacks report already exists for war ID ' + war_id.toString() + '.');
            return;
        }
    }

    let winner = war['factions'][0]['id'] === war['winner'] ? war['factions'][0]['name'] : war['factions'][1]['name'];

    const description = `
This report contains all attacks / losses during the war period that were part of the war.

Note, this report only contains ranked wars and successful attacks on the faction and does not include any voided/incomplete attacks.

War: ${war_id} [${war['factions'][0]['name']} vs ${war['factions'][1]['name']}]
Score: ${war['factions'][0]['score']} - ${war['factions'][1]['score']}
Winner: ${winner}

War start time: ${new Date(war['start'] * 1000).toString()}
War end end: ${new Date(war['end'] * 1000).toString()}
`;

    const name = war_id.toString() + ' - War net attacks';
    const category = 1;
    let data = [];

    // Filter out only ranked wars successful attacks.
    let filtered = attacks.filter(
        attack => attack['is_ranked_war'] === true && (attack['result'] === 'Attacked' || attack['result'] === 'Mugged' || attack['result'] === 'Hospitalized')
    );

    // Generate report
    let members = {};

    for (const attack of filtered) {
        const member = ((attack['defender']['faction']['id'] === config['faction']) ? 'defender' : 'attacker');

        if (!(attack[member]['id'] in members)) {
            members[attack[member]['id']] = {
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
            members[attack[member]['id']]['losses'] += 1;
            members[attack[member]['id']]['respect_they_gained'] += attack['respect_gain'];
        } else {
            members[attack[member]['id']]['attacks'] += 1;
            members[attack[member]['id']]['respect_we_gained'] += attack['respect_gain'];
        }
    }

    // Round respect gained to 2 decimal places
    for (const member in members) {
        members[member]['respect_we_gained'] = Math.round(members[member]['respect_we_gained'] * 100) / 100;
        members[member]['respect_they_gained'] = Math.round(members[member]['respect_they_gained'] * 100) / 100;
        members[member]['net_respect_gained'] = Math.round((members[member]['respect_we_gained'] - members[member]['respect_they_gained']) * 100) / 100;
        members[member]['net_attacks'] = members[member]['attacks'] - members[member]['losses'];

        data.push({
            "ID": member,
            "Name": members[member]['name'],
            "Level": members[member]['level'],
            "Attacks": members[member]['attacks'],
            "Respect We Gained": members[member]['respect_we_gained'],
            "Losses": members[member]['losses'],
            "Respect They Gained": members[member]['respect_they_gained'],
            "Net Attacks": members[member]['net_attacks'],
            "Net Respect Gained": members[member]['net_respect_gained']
        });
    }

    // Save report to file
    fs.writeFileSync(`data/reports/wars/${war_id.toString()}/net_report.json`, JSON.stringify(data, null, 2));
    logger.info('Saved net attacks report to file for war ID ' + war_id.toString() + ' - data/reports/wars/' + war_id.toString() + '/net_report.json');

    // Send report to Web server
    const url = await sendReport({ name, description, category, data });

    // Send report to Discord
    const channel = client.channels.cache.get(config['channels']['war-log']);
    if (channel) channel.send({ content: bold(underline('Net attacks report for war ID ' + war_id.toString())+'\n\n'+hyperlink('View report on dashboard', url))});
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
async function lossesReport(client, war, attacks, force=false) {
    const config = getConfig();
    const war_id = war['war_id'];
    
    // get winner name
    let winner = war['factions'][0]['id'] === war['winner'] ? war['factions'][0]['name'] : war['factions'][1]['name'];

    const description = `
This report contains all defends during the war period that were successful attacks on the faction.

War: ${war_id} (${war['factions'][0]['name']} vs ${war['factions'][1]['name']})
Score: ${war['factions'][0]['score']} - ${war['factions'][1]['score']}
Winner: ${winner}

Time start: ${new Date(war['start'] * 1000).toString()}
Time end: ${new Date(war['end'] * 1000).toString()}
`;

    const name = war_id.toString() + ' - War losses';
    const category = 1;
    let data = [];

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
    let members = {};

    for (const attack of filtered) {
        if (!(attack['defender']['id'] in members)) {
            members[attack['defender']['id']] = {
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
        members[attack['defender']['id']]['losses'] += 1;
        members[attack['defender']['id']]['respect_they_gained'] += attack['respect_gain'];
        switch (attack['result'].toLowerCase()) {
            case 'attacked':
                members[attack['defender']['id']]['types']['attacked'] += 1;
                break;
            case 'mugged':
                members[attack['defender']['id']]['types']['mugged'] += 1;
                break;
            case 'hospitalized':
                members[attack['defender']['id']]['types']['hospitalized'] += 1;
                break;
            default:
                members[attack['defender']['id']]['types']['other'] += 1;
        }
    }

    for (const member in members) {
        // Round respect gained to 2 decimal places
        members[member]['respect_they_gained'] = Math.round(members[member]['respect_they_gained'] * 100) / 100;
        data.push({
            "ID": member,
            "Name": members[member]['name'],
            "Level": members[member]['level'],
            "Result: Attacked": members[member]['types']['attacked'],
            "Result: Mugged": members[member]['types']['mugged'],
            "Result: Hospitalized": members[member]['types']['hospitalized'],
            "Result: Other": members[member]['types']['other'],
            "Total Losses": members[member]['losses'],
            "Respect They Gained": members[member]['respect_they_gained']
        });
    }

    // Sort members by respect gained
    //members = Object.fromEntries(Object.entries(members).sort((a, b) => b[1]['losses'] - a[1]['losses']))

    // Save report to file
    fs.writeFileSync(`data/reports/wars/${war_id.toString()}/losses.json`, JSON.stringify(data, null, 2));
    logger.info('Saved war losses report to file for war ID ' + war_id.toString() + ' - data/reports/wars/' + war_id.toString() + '/losses.json');

    // Send report to Web server
    const url = await sendReport({ name, description, category, data });

    // Send report to Discord
    const channel = client.channels.cache.get(config['channels']['war-log']);
    if (channel) channel.send({ content: bold(underline('War losses report for war ID ' + war_id.toString())+'\n\n'+hyperlink('View report on dashboard', url))});
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
        await lossesReport(client, war, attacks, force);
    } catch(err) {
        logger.error('Failed to generate war losses report for war ID ' + war['war_id'], { error: err.toString() });
        const channel = client.channels.cache.get(config['channels']['war-log']);
        if (channel) channel.send({ content: 'Failed to generate war losses report for war ID ' + war['war_id'] + ' ' + userMention(config['owner_id']) + '.' });
    }

    // Generate net attacks report
    try {
        await netReport(client, war, attacks, force);
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
            await FiveHundredLimitReport(client, war, attacks, force);
        } catch(err) {
            logger.error('Failed to generate 500 limit report for war ID ' + war['war_id'], { error: err.toString() });
            const channel = client.channels.cache.get(config['channels']['war-log']);
            if (channel) channel.send({ content: 'Failed to generate 500 attack limit report for war ID ' + war['war_id'] + ' ' + userMention(config['owner_id']) + '.' });
        }
    }
}

/**
 * Sends reports to the dashboard server.
 * 
 * @param {
 * "name": String,
 * "description": String,
 * "category": Number,
 * "data": [{}]
 * } reportData 
 */
async function sendReport(reportData) {
    return new Promise(async (resolve, reject) => {
        const url = 'https://torn.jaxkdev.net/internal/reports';
        try {
            const response = await axios.post(url, reportData, { headers: { 'Authorization': process.env.INTERNAL_TOKEN } });
            if (response.status !== 200) {
                logger.error('Failed to send reports to dashboard server: HTTP-' + response.status.toString());
                reject('Failed to send reports to dashboard server: HTTP-' + response.status.toString());
                return;
            } else {
                logger.info('Sent reports to dashboard server.');
                resolve(response.data['report_url']);
            }
        } catch (err) {
            logger.error('Failed to send reports to dashboard server: ' + err, { error: err.toString() });
            reject(err);
        }
    });
}

module.exports = generateAllReports;