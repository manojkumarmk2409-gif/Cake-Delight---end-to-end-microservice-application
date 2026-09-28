const winston = require('winston');
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    defaultMeta: { service: 'order-service' },
    transports: [new winston.transports.Console({ format: winston.format.simple() })]
});
module.exports = logger;
