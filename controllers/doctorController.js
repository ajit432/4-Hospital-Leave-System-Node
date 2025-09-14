const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
const { logger } = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorLogger');
const config = require('../config');

// Update doctor profile
const updateProfile = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { name, department, phone } = req.body;

    try {
        // Update profile
        await pool.execute(
            'UPDATE users SET name = ?, department = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [name, department, phone, userId]
        );

        // Get updated user data
        const [users] = await pool.execute(
            'SELECT id, name, email, role, department, phone, employee_id, profile_picture, created_at, updated_at FROM users WHERE id = ?',
            [userId]
        );

        logger.info(`✅ Profile updated for user: ${req.user.email}`);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: users[0]
            }
        });
    } catch (error) {
        logger.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

// Change password
const changePassword = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    try {
        // Get current password hash
        const [users] = await pool.execute(
            'SELECT password FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, users[0].password);

        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const saltRounds = 12;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await pool.execute(
            'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [hashedNewPassword, userId]
        );

        logger.info(`✅ Password changed for user: ${req.user.email}`);

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        logger.error('Password change error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
});

// Upload profile picture
const uploadProfilePicture = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No file uploaded'
        });
    }

    try {
        // Get current profile picture to delete old one
        const [users] = await pool.execute(
            'SELECT profile_picture FROM users WHERE id = ?',
            [userId]
        );

        const oldProfilePicture = users[0]?.profile_picture;

        // Update profile picture path in database
        const profilePicturePath = `/uploads/profiles/${req.file.filename}`;
        await pool.execute(
            'UPDATE users SET profile_picture = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [profilePicturePath, userId]
        );

        // Delete old profile picture if it exists
        if (oldProfilePicture) {
            const oldFilePath = path.join(__dirname, '..', oldProfilePicture);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
        }

        logger.info(`✅ Profile picture uploaded for user: ${req.user.email}`);

        res.json({
            success: true,
            message: 'Profile picture uploaded successfully',
            data: {
                profile_picture: profilePicturePath
            }
        });
    } catch (error) {
        logger.error('Profile picture upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload profile picture'
        });
    }
});

// Remove profile picture
const removeProfilePicture = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    try {
        // Get current profile picture
        const [users] = await pool.execute(
            'SELECT profile_picture FROM users WHERE id = ?',
            [userId]
        );

        const currentProfilePicture = users[0]?.profile_picture;

        if (!currentProfilePicture) {
            return res.status(400).json({
                success: false,
                message: 'No profile picture to remove'
            });
        }

        // Remove profile picture from database
        await pool.execute(
            'UPDATE users SET profile_picture = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [userId]
        );

        // Delete the file from filesystem
        const filePath = path.join(__dirname, '..', currentProfilePicture);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        logger.info(`✅ Profile picture removed for user: ${req.user.email}`);

        res.json({
            success: true,
            message: 'Profile picture removed successfully'
        });
    } catch (error) {
        logger.error('Profile picture removal error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove profile picture'
        });
    }
});

// Get dashboard data
const getDashboard = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const currentYear = new Date().getFullYear();

    try {
        // Get leave balance
        const [leaveBalance] = await pool.execute(`
            SELECT 
                lb.category_id,
                lc.name as category_name,
                lb.total_days,
                lb.used_days,
                lb.remaining_days
            FROM doctor_leave_balance lb
            JOIN leave_categories lc ON lb.category_id = lc.id
            WHERE lb.doctor_id = ? AND lb.year = ?
        `, [userId, currentYear]);

        // Get pending leaves
        const [pendingLeaves] = await pool.execute(`
            SELECT 
                la.id,
                la.start_date,
                la.end_date,
                la.total_days,
                la.reason,
                la.status,
                la.applied_at,
                lc.name as category_name
            FROM leave_applications la
            JOIN leave_categories lc ON la.category_id = lc.id
            WHERE la.doctor_id = ? AND la.status = 'pending'
            ORDER BY la.applied_at DESC
        `, [userId]);

        // Get recent leave history
        const [recentLeaves] = await pool.execute(`
            SELECT 
                la.id,
                la.start_date,
                la.end_date,
                la.total_days,
                la.reason,
                la.status,
                la.applied_at,
                la.reviewed_at,
                la.admin_comment,
                lc.name as category_name,
                u.name as reviewed_by_name
            FROM leave_applications la
            JOIN leave_categories lc ON la.category_id = lc.id
            LEFT JOIN users u ON la.reviewed_by = u.id
            WHERE la.doctor_id = ?
            ORDER BY la.applied_at DESC
            LIMIT 5
        `, [userId]);

        // Get leave statistics
        const [leaveStats] = await pool.execute(`
            SELECT 
                COUNT(*) as total_applications,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count
            FROM leave_applications 
            WHERE doctor_id = ? AND YEAR(applied_at) = ?
        `, [userId, currentYear]);

        res.json({
            success: true,
            data: {
                leaveBalance,
                pendingLeaves,
                recentLeaves,
                statistics: leaveStats[0]
            }
        });
    } catch (error) {
        logger.error('Dashboard data error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load dashboard data'
        });
    }
});

// Get all doctors (admin only)
const getAllDoctors = asyncHandler(async (req, res) => {
    try {
        const { status = 'active' } = req.query; // active, inactive (default to active)
        
        let whereClause = "WHERE role = 'doctor' AND is_active = 1"; // Default to active only
        if (status === 'inactive') {
            whereClause = "WHERE role = 'doctor' AND is_active = 0";
        }

        const [doctors] = await pool.execute(`
            SELECT 
                id, 
                name, 
                email, 
                department, 
                phone, 
                employee_id, 
                profile_picture,
                is_active,
                created_at
            FROM users 
            ${whereClause}
            ORDER BY is_active DESC, name ASC
        `);

        res.json({
            success: true,
            data: {
                doctors
            }
        });
    } catch (error) {
        logger.error('Get all doctors error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch doctors'
        });
    }
});

// Deactivate doctor (admin only)
const deactivateDoctor = asyncHandler(async (req, res) => {
    try {
        const { doctorId } = req.params;

        // Check if doctor exists
        const [doctors] = await pool.execute(
            'SELECT id, name, email, is_active FROM users WHERE id = ? AND role = ?',
            [doctorId, 'doctor']
        );

        if (doctors.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        const doctor = doctors[0];

        if (doctor.is_active === 0) {
            return res.status(400).json({
                success: false,
                message: 'Doctor is already inactive'
            });
        }

        // Deactivate doctor
        await pool.execute(
            'UPDATE users SET is_active = 0 WHERE id = ?',
            [doctorId]
        );

        logger.info(`✅ Doctor deactivated: ${doctor.email} (ID: ${doctorId})`);

        res.json({
            success: true,
            message: 'Doctor deactivated successfully',
            data: {
                doctor: {
                    id: doctor.id,
                    name: doctor.name,
                    email: doctor.email,
                    is_active: 0
                }
            }
        });
    } catch (error) {
        logger.error('Deactivate doctor error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to deactivate doctor'
        });
    }
});

// Reactivate doctor (admin only)
const reactivateDoctor = asyncHandler(async (req, res) => {
    try {
        const { doctorId } = req.params;

        // Check if doctor exists
        const [doctors] = await pool.execute(
            'SELECT id, name, email, is_active FROM users WHERE id = ? AND role = ?',
            [doctorId, 'doctor']
        );

        if (doctors.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        const doctor = doctors[0];

        if (doctor.is_active === 1) {
            return res.status(400).json({
                success: false,
                message: 'Doctor is already active'
            });
        }

        // Reactivate doctor
        await pool.execute(
            'UPDATE users SET is_active = 1 WHERE id = ?',
            [doctorId]
        );

        logger.info(`✅ Doctor reactivated: ${doctor.email} (ID: ${doctorId})`);

        res.json({
            success: true,
            message: 'Doctor reactivated successfully',
            data: {
                doctor: {
                    id: doctor.id,
                    name: doctor.name,
                    email: doctor.email,
                    is_active: 1
                }
            }
        });
    } catch (error) {
        logger.error('Reactivate doctor error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reactivate doctor'
        });
    }
});

module.exports = {
    updateProfile,
    changePassword,
    uploadProfilePicture,
    removeProfilePicture,
    getDashboard,
    getAllDoctors,
    deactivateDoctor,
    reactivateDoctor
};
