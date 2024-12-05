require('dotenv').config({ path: 'data/.env' });
const { REST, Routes } = require('discord.js');
const { getConfig } = require('../src/config');
const fs = require('fs');
const hash = require('object-hash');

let commands = [];
for (const command of require('../src/commands/loader')) {
    commands.push(command.data.toJSON());
}

//create file if it doesn't exist
if (!fs.existsSync('data/slash-commands.hash')) { fs.writeFileSync('data/slash-commands.hash', ''); }

old_hash = fs.readFileSync('data/slash-commands.hash', 'utf8').trim();
new_hash = hash(commands);

if (old_hash === new_hash) {
	console.log('No changes detected in commands, skipping registration.');
	return;
} else {
	fs.writeFileSync('data/slash-commands.hash', new_hash);
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// and deploy your commands!
(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationGuildCommands(getConfig().client_id, getConfig().guild_id),
			{ body: commands },
		);

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();