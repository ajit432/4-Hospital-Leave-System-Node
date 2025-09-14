const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { pool } = require('../config/database');
const { logger } = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorLogger');

// Generate JWT token
const generateToken = (userId, email, role) => {
    return jwt.sign(
        { userId, email, role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
    );
};

// Register new user (Admin only - for creating admin accounts)
const register = asyncHandler(async (req, res) => {
    const { name, email, password, department, phone, employee_id, role = 'admin' } = req.body;

    // Check if user already exists
    const [existingUsers] = await pool.execute(
        'SELECT id FROM users WHERE email = ? OR employee_id = ?',
        [email, employee_id]
    );

    if (existingUsers.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'User with this email or employee ID already exists'
        });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    try {
        // Insert new user
        const [result] = await pool.execute(
            'INSERT INTO users (name, email, password, role, department, phone, employee_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, email, hashedPassword, role, department, phone, employee_id]
        );

        // Generate token
        const token = generateToken(result.insertId, email, role);

        // Get user data without password
        const [newUser] = await pool.execute(
            'SELECT id, name, email, role, department, phone, employee_id, profile_picture, created_at FROM users WHERE id = ?',
            [result.insertId]
        );

        logger.info(`✅ New user registered: ${email} (${role})`);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: newUser[0],
                token
            }
        });
    } catch (error) {
        logger.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed'
        });
    }
});

// Register new doctor (Admin only)
const registerDoctor = asyncHandler(async (req, res) => {
    const { name, email, password, department, phone, employee_id } = req.body;
    
    // Ensure optional fields are null instead of undefined
    const doctorDepartment = department || null;
    const doctorPhone = phone || null;

    // Check if user already exists
    const [existingUsers] = await pool.execute(
        'SELECT id FROM users WHERE email = ? OR employee_id = ?',
        [email, employee_id]
    );

    if (existingUsers.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Doctor with this email or employee ID already exists'
        });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    try {
        // Insert new doctor
        const [result] = await pool.execute(
            'INSERT INTO users (name, email, password, role, department, phone, employee_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, email, hashedPassword, 'doctor', doctorDepartment, doctorPhone, employee_id]
        );

        // Get doctor data without password
        const [newDoctor] = await pool.execute(
            'SELECT id, name, email, role, department, phone, employee_id, profile_picture, created_at FROM users WHERE id = ?',
            [result.insertId]
        );

        logger.info(`✅ New doctor registered by admin: ${email}`);

        res.status(201).json({
            success: true,
            message: 'Doctor registered successfully',
            data: {
                doctor: newDoctor[0]
            }
        });
    } catch (error) {
        logger.error('Doctor registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Doctor registration failed'
        });
    }
});

// Login user
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Get user from database
    const [users] = await pool.execute(
        'SELECT id, name, email, password, role, department, phone, employee_id, profile_picture, is_active FROM users WHERE email = ?',
        [email]
    );

    if (users.length === 0) {
        return res.status(401).json({
            success: false,
            message: 'Invalid email or password'
        });
    }

    const user = users[0];

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        return res.status(401).json({
            success: false,
            message: 'Invalid email or password'
        });
    }

    // Check if user is active
    if (user.is_active === 0) {
        return res.status(403).json({
            success: false,
            message: 'Your account has been deactivated. Please contact administrator.'
        });
    }

    // Generate token
    const token = generateToken(user.id, user.email, user.role);

    // Remove password from user object
    delete user.password;

    logger.info(`✅ User logged in: ${email} (${user.role})`);

    res.json({
        success: true,
        message: 'Login successful',
        data: {
            user,
            token
        }
    });
});

// Get current user profile
const getProfile = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const [users] = await pool.execute(
        'SELECT id, name, email, role, department, phone, employee_id, profile_picture, created_at, updated_at FROM users WHERE id = ?',
        [userId]
    );

    if (users.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    res.json({
        success: true,
        data: {
            user: users[0]
        }
    });
});

// Logout user (client-side token removal)
const logout = asyncHandler(async (req, res) => {
    logger.info(`✅ User logged out: ${req.user.email}`);
    
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// Refresh token
const refreshToken = asyncHandler(async (req, res) => {
    const user = req.user;
    const token = generateToken(user.id, user.email, user.role);

    res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
            token
        }
    });
});

module.exports = {
    register,
    registerDoctor,
    login,
    getProfile,
    logout,
    refreshToken
};
