const fs = require('fs');

let config = {}

// Read the config file and parse json.
function loadConfig(){
    try {
        const data = fs.readFileSync(process.env.ENVIRONMENT == "prod" ? 'data/config.json' : 'data/config.dev.json', 'utf8')
        config = JSON.parse(data)
    } catch (err) {
        throw new Error('Error reading config file: ' + err)
    }
};

function getConfig(){
    // If the config object is empty, pre-load the config.
    if (Object.keys(config).length === 0){
        try{
            loadConfig();
        } catch (err) {
            throw new Error('Config failed to load: ' + err)
        }
    }
    return config;
};

module.exports = { getConfig, loadConfig };