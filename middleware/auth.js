const jwt = require('jsonwebtoken');
const config = require('../config');
const { pool } = require('../config/database');
const { logger } = require('../utils/logger');

// JWT Authentication middleware
const authenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies?.token;
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const decoded = jwt.verify(token, config.jwtSecret);
        
        // Get user from database to ensure they still exist
        const [users] = await pool.execute(
            'SELECT id, email, name, role, department, phone, employee_id, profile_picture FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. User not found.'
            });
        }

        req.user = users[0];
        next();
    } catch (error) {
        logger.error('Authentication error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token.'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Authentication failed.'
        });
    }
};

// Role-based authorization middleware
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.'
            });
        }

        next();
    };
};

// Admin only middleware
const adminOnly = authorize('admin');

// Doctor only middleware
const doctorOnly = authorize('doctor');

// Doctor or Admin middleware
const doctorOrAdmin = authorize('doctor', 'admin');

module.exports = {
    authenticate,
    authorize,
    adminOnly,
    doctorOnly,
    doctorOrAdmin
};
