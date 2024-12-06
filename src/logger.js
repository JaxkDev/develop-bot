const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
let { getConfig } = require('./config');

const transport = new DailyRotateFile({
    dirname: `data/logs/`,
    filename: 'log-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    handleExceptions: true,
    level: 'debug',
    json: false,
    maxSize: '20m',
    frequency: '1d',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    )
});

transport.on('rotate', function (oldFilename, newFilename) {
    logger.info('Log file switched from: ' + oldFilename + ' to: ' + newFilename);
});

const logger = winston.createLogger({
    transports: [
        transport,
        new winston.transports.Console({
            level: getConfig().debug ? 'debug' : 'info',
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp(),
                getConfig().debug ? winston.format.simple() : winston.format.printf(info => {
                    return `[${info.timestamp}] [${info.level}] : ${info.message}`;
                })
            ),
            forceConsole: true,
        })
    ],
    exitOnError: false
});

module.exports = logger;