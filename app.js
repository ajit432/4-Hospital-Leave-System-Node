const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Import configuration and utilities
const config = require('./config');
const { testConnection } = require('./config/database');
const { logger, requestLogger } = require('./utils/logger');
const { errorLogger, notFoundHandler } = require('./middleware/errorLogger');

// Import routes
const authRoutes = require('./routes/auth');
const doctorRoutes = require('./routes/doctor');
const leaveRoutes = require('./routes/leave');

const app = express();

// Create necessary directories
const directories = ['logs', 'uploads', 'uploads/profiles'];
directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`📁 Created directory: ${dir}`);
    }
});

// Middleware setup
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000'
    ],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use(requestLogger);

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check route
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Hospital Leave Management System API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/leave', leaveRoutes);

// Welcome route
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to Hospital Leave Management System API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            doctor: '/api/doctor',
            leave: '/api/leave',
            health: '/health'
        }
    });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorLogger);

// Start server
const startServer = async () => {
    try {
        // Test database connection
        const dbConnected = await testConnection();
        
        if (!dbConnected) {
            logger.error('❌ Failed to connect to database. Exiting...');
            process.exit(1);
        }

        const port = config.port;
        app.listen(port, () => {
            logger.info(`🚀 Server started on port ${port}`);
            logger.info(`🏥 Hospital Leave Management System API`);
            logger.info(`📍 Health check: http://localhost:${port}/health`);
            logger.info(`📋 API documentation: http://localhost:${port}/`);
            logger.info(`🌍 Environment: ${config.nodeEnv}`);
        });
    } catch (error) {
        logger.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Promise Rejection:', err);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received. Shutting down gracefully...');
    process.exit(0);
});

startServer();
