const winston = require('winston');
const config = require('../config');

// Create logger configuration
const loggerConfig = {
    level: config.nodeEnv === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.printf((info) => {
            return `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}${info.stack ? '\n' + info.stack : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf((info) => {
                    return `${info.timestamp} [${info.level}]: ${info.message}${info.stack ? '\n' + info.stack : ''}`;
                })
            )
        }),
        new winston.transports.File({ 
            filename: 'logs/error.log', 
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        new winston.transports.File({ 
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    ]
};

const logger = winston.createLogger(loggerConfig);

// Request logging middleware
const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    logger.info(`📥 ${req.method} ${req.originalUrl} - IP: ${req.ip} - User-Agent: ${req.get('User-Agent')}`);
    
    if (Object.keys(req.body).length > 0) {
        // Log request body but hide sensitive fields
        const logBody = { ...req.body };
        if (logBody.password) logBody.password = '[HIDDEN]';
        if (logBody.newPassword) logBody.newPassword = '[HIDDEN]';
        if (logBody.currentPassword) logBody.currentPassword = '[HIDDEN]';
        logger.info(`📄 Request Body: ${JSON.stringify(logBody)}`);
    }
    
    // Override res.json to log response
    const originalJson = res.json;
    res.json = function(data) {
        const duration = Date.now() - start;
        logger.info(`📤 ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Duration: ${duration}ms`);
        
        // Log response data (limit size for large responses)
        const responseString = JSON.stringify(data);
        if (responseString.length > 1000) {
            logger.info(`📋 Response: [Large response - ${responseString.length} characters]`);
        } else {
            logger.info(`📋 Response: ${responseString}`);
        }
        
        return originalJson.call(this, data);
    };
    
    next();
};

module.exports = {
    logger,
    requestLogger
};
