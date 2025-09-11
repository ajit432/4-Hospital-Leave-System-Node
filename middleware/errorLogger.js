const { logger } = require('../utils/logger');

// Global error handling middleware
const errorLogger = (err, req, res, next) => {
    // Log the error with full stack trace
    logger.error(`❌ Error in ${req.method} ${req.originalUrl}: ${err.message}`, {
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.body,
        params: req.params,
        query: req.query
    });

    // Don't expose internal errors in production
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Determine error status code
    const statusCode = err.statusCode || err.status || 500;
    
    // Create error response
    const errorResponse = {
        success: false,
        message: isProduction && statusCode === 500 
            ? 'Internal Server Error' 
            : err.message,
        ...(isProduction ? {} : { stack: err.stack }),
        timestamp: new Date().toISOString(),
        path: req.originalUrl
    };

    res.status(statusCode).json(errorResponse);
};

// 404 handler
const notFoundHandler = (req, res) => {
    logger.warn(`🔍 404 - Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
};

// Async error wrapper
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = {
    errorLogger,
    notFoundHandler,
    asyncHandler
};
