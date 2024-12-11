const { getConfig } = require('../config');
const config = getConfig();

const logger = require('../logger');
const fs = require('fs');
const hash = require('object-hash');

//create file if it doesn't exist
if (!fs.existsSync('data/reports/')) { fs.writeFileSync('data/slash-commands.hash', '{}'); }

hashes = JSON.parse(fs.readFileSync('data/slash-commands.hash', 'utf8').trim())
old_hash = hashes[process.env.ENVIRONMENT] ?? '';
new_hash = hash(commands);

if (old_hash === new_hash) {
	logger.debug('No changes detected in commands, skipping registration.');
	return;
} else {
	hashes[process.env.ENVIRONMENT] = new_hash;
	fs.writeFileSync('data/slash-commands.hash', JSON.stringify(hashes));
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// and deploy your commands!
(async () => {
	try {
		logger.debug(`Started refreshing ${commands.length} application (/) commands.`);

		// rest.put(Routes.applicationGuildCommands(getConfig().client_id, "1313963584450986134"), { body: [] })
		// 	.then(() => console.log('Successfully deleted all guild commands.'))
		// 	.catch(console.error);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationCommands(getConfig().client_id),
			{ body: commands },
		);

		logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		logger.error("Error refreshing application commands", { error: error.toString() });
	}
})();