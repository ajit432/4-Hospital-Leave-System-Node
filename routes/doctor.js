const express = require('express');
const router = express.Router();
const {
    updateProfile,
    changePassword,
    uploadProfilePicture,
    removeProfilePicture,
    getDashboard,
    getAllDoctors
} = require('../controllers/doctorController');
const { authenticate, doctorOrAdmin, adminOnly } = require('../middleware/auth');
const { uploadProfilePicture: uploadMiddleware, handleUploadError } = require('../middleware/upload');
const { validateProfileUpdate, validatePasswordChange } = require('../middleware/validation');

// Doctor/Admin routes
router.get('/dashboard', authenticate, doctorOrAdmin, getDashboard);
router.put('/profile', authenticate, doctorOrAdmin, validateProfileUpdate, updateProfile);
router.put('/change-password', authenticate, doctorOrAdmin, validatePasswordChange, changePassword);
router.post('/upload-profile-picture', authenticate, doctorOrAdmin, uploadMiddleware, handleUploadError, uploadProfilePicture);
router.delete('/remove-profile-picture', authenticate, doctorOrAdmin, removeProfilePicture);

// Admin only routes
router.get('/all', authenticate, adminOnly, getAllDoctors);

module.exports = router;
