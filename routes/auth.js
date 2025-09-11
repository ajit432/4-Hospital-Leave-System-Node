const express = require('express');
const router = express.Router();
const { register, login, getProfile, logout, refreshToken } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validateRegistration, validateLogin } = require('../middleware/validation');

// Public routes
router.post('/register', validateRegistration, register);
router.post('/login', validateLogin, login);

// Protected routes
router.get('/profile', authenticate, getProfile);
router.post('/logout', authenticate, logout);
router.post('/refresh', authenticate, refreshToken);

//
module.exports = router;
