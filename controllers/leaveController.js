const { pool } = require('../config/database');
const { logger } = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorLogger');

// Calculate leave days (excluding weekends)
const calculateLeaveDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let totalDays = 0;
    
    while (start <= end) {
        const dayOfWeek = start.getDay();
        // Skip weekends (0 = Sunday, 6 = Saturday)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            totalDays++;
        }
        start.setDate(start.getDate() + 1);
    }
    
    return totalDays;
};

// Get leave categories
const getLeaveCategories = asyncHandler(async (req, res) => {
    try {
        const { status = 'active' } = req.query; // active, inactive (default to active)
        
        let whereClause = 'WHERE is_active = 1'; // Default to active only
        if (status === 'inactive') {
            whereClause = 'WHERE is_active = 0';
        }

        const [categories] = await pool.execute(
            `SELECT id, name, max_days, description, is_active, created_at FROM leave_categories ${whereClause} ORDER BY is_active DESC, name ASC`
        );

        res.json({
            success: true,
            data: {
                categories
            }
        });
    } catch (error) {
        logger.error('Get leave categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch leave categories'
        });
    }
});

// Apply for leave
const applyLeave = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { category_id, start_date, end_date, reason } = req.body;
    const currentYear = new Date().getFullYear();

    try {
        // Validate dates
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (startDate < today) {
            return res.status(400).json({
                success: false,
                message: 'Leave start date cannot be in the past'
            });
        }

        if (endDate < startDate) {
            return res.status(400).json({
                success: false,
                message: 'Leave end date cannot be before start date'
            });
        }

        // Calculate total days
        const totalDays = calculateLeaveDays(start_date, end_date);

        if (totalDays === 0) {
            return res.status(400).json({
                success: false,
                message: 'Leave must include at least one working day'
            });
        }

        // Check leave category limits
        const [categories] = await pool.execute(
            'SELECT max_days FROM leave_categories WHERE id = ?',
            [category_id]
        );

        if (categories.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid leave category'
            });
        }

        if (totalDays > categories[0].max_days) {
            return res.status(400).json({
                success: false,
                message: `Leave days exceed maximum allowed (${categories[0].max_days}) for this category`
            });
        }

        // Check for overlapping leaves
        const [overlapping] = await pool.execute(`
            SELECT id FROM leave_applications 
            WHERE doctor_id = ? 
            AND status IN ('pending', 'approved')
            AND (
                (start_date <= ? AND end_date >= ?) OR
                (start_date <= ? AND end_date >= ?) OR
                (start_date >= ? AND end_date <= ?)
            )
        `, [userId, start_date, start_date, end_date, end_date, start_date, end_date]);

        if (overlapping.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'You have overlapping leave applications for the selected dates'
            });
        }

        // Check leave balance (if doctor has an allocation)
        const [balance] = await pool.execute(`
            SELECT remaining_days, total_days, used_days FROM doctor_leave_balance 
            WHERE doctor_id = ? AND category_id = ? AND year = ?
        `, [userId, category_id, currentYear]);

        if (balance.length > 0) {
            // Doctor has an allocated balance - check against remaining days
            if (totalDays > balance[0].remaining_days) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient leave balance. You have ${balance[0].remaining_days} days remaining out of ${balance[0].total_days} allocated days for this category.`
                });
            }
        } else {
            // Doctor has no allocation for this category - only check against category max
            logger.info(`Doctor ${userId} has no allocation for category ${category_id}. Proceeding with category max validation only.`);
        }

        // Apply for leave
        const [result] = await pool.execute(`
            INSERT INTO leave_applications 
            (doctor_id, category_id, start_date, end_date, total_days, reason) 
            VALUES (?, ?, ?, ?, ?, ?)
        `, [userId, category_id, start_date, end_date, totalDays, reason]);

        logger.info(`✅ Leave application submitted by user: ${req.user.email} for ${totalDays} days`);

        res.status(201).json({
            success: true,
            message: 'Leave application submitted successfully',
            data: {
                application_id: result.insertId,
                total_days: totalDays
            }
        });
    } catch (error) {
        logger.error('Apply leave error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit leave application'
        });
    }
});

// Get user's leave applications
const getMyLeaves = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    try {
        let whereClause = 'WHERE la.doctor_id = ?';
        let queryParams = [userId];

        if (status && ['pending', 'approved', 'rejected'].includes(status)) {
            whereClause += ' AND la.status = ?';
            queryParams.push(status);
        }

        const [leaves] = await pool.execute(`
            SELECT 
                la.id,
                la.start_date,
                la.end_date,
                la.total_days,
                la.reason,
                la.status,
                la.admin_comment,
                la.applied_at,
                la.reviewed_at,
                lc.name as category_name,
                u.name as reviewed_by_name
            FROM leave_applications la
            JOIN leave_categories lc ON la.category_id = lc.id
            LEFT JOIN users u ON la.reviewed_by = u.id
            ${whereClause}
            ORDER BY la.applied_at DESC
            LIMIT ? OFFSET ?
        `, [...queryParams, parseInt(limit), parseInt(offset)]);

        // Get total count
        const [countResult] = await pool.execute(`
            SELECT COUNT(*) as total
            FROM leave_applications la
            ${whereClause}
        `, queryParams);

        res.json({
            success: true,
            data: {
                leaves,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: countResult[0].total,
                    pages: Math.ceil(countResult[0].total / limit)
                }
            }
        });
    } catch (error) {
        logger.error('Get my leaves error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch leave applications'
        });
    }
});

// Get leave balance
const getLeaveBalance = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const currentYear = new Date().getFullYear();

    try {
        const [balance] = await pool.execute(`
            SELECT 
                lb.category_id,
                lc.name as category_name,
                lb.total_days,
                lb.used_days,
                lb.remaining_days,
                lc.max_days
            FROM doctor_leave_balance lb
            JOIN leave_categories lc ON lb.category_id = lc.id
            WHERE lb.doctor_id = ? AND lb.year = ?
            ORDER BY lc.name
        `, [userId, currentYear]);

        res.json({
            success: true,
            data: {
                balance,
                year: currentYear
            }
        });
    } catch (error) {
        logger.error('Get leave balance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch leave balance'
        });
    }
});

// Get all leave applications (admin only)
const getAllLeaves = asyncHandler(async (req, res) => {
    const { status, doctor_id, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    try {
        let whereClause = 'WHERE 1=1';
        let queryParams = [];

        if (status && ['pending', 'approved', 'rejected'].includes(status)) {
            whereClause += ' AND la.status = ?';
            queryParams.push(status);
        }

        if (doctor_id) {
            whereClause += ' AND la.doctor_id = ?';
            queryParams.push(doctor_id);
        }

        const [leaves] = await pool.execute(`
            SELECT 
                la.id,
                la.doctor_id,
                la.start_date,
                la.end_date,
                la.total_days,
                la.reason,
                la.status,
                la.admin_comment,
                la.applied_at,
                la.reviewed_at,
                lc.name as category_name,
                d.name as doctor_name,
                d.employee_id,
                d.department,
                admin.name as reviewed_by_name
            FROM leave_applications la
            JOIN leave_categories lc ON la.category_id = lc.id
            JOIN users d ON la.doctor_id = d.id
            LEFT JOIN users admin ON la.reviewed_by = admin.id
            ${whereClause}
            ORDER BY la.applied_at DESC
            LIMIT ? OFFSET ?
        `, [...queryParams, parseInt(limit), parseInt(offset)]);

        // Get total count
        const [countResult] = await pool.execute(`
            SELECT COUNT(*) as total
            FROM leave_applications la
            ${whereClause}
        `, queryParams);

        res.json({
            success: true,
            data: {
                leaves,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: countResult[0].total,
                    pages: Math.ceil(countResult[0].total / limit)
                }
            }
        });
    } catch (error) {
        logger.error('Get all leaves error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch leave applications'
        });
    }
});

// Review leave application (admin only)
const reviewLeave = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, admin_comment } = req.body;
    const adminId = req.user.id;

    try {
        // Get leave application details
        const [applications] = await pool.execute(`
            SELECT la.*, lc.name as category_name
            FROM leave_applications la
            JOIN leave_categories lc ON la.category_id = lc.id
            WHERE la.id = ?
        `, [id]);

        if (applications.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Leave application not found'
            });
        }

        const application = applications[0];

        if (application.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Leave application has already been reviewed'
            });
        }

        // Update leave application
        await pool.execute(`
            UPDATE leave_applications 
            SET status = ?, admin_comment = ?, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ?
            WHERE id = ?
        `, [status, admin_comment, adminId, id]);

        // Update leave balance if approved
        if (status === 'approved') {
            const currentYear = new Date().getFullYear();
            
            // Check if balance record exists
            const [balanceCheck] = await pool.execute(`
                SELECT id FROM doctor_leave_balance 
                WHERE doctor_id = ? AND category_id = ? AND year = ?
            `, [application.doctor_id, application.category_id, currentYear]);

            if (balanceCheck.length > 0) {
                // Update existing balance
                await pool.execute(`
                    UPDATE doctor_leave_balance 
                    SET used_days = used_days + ?
                    WHERE doctor_id = ? AND category_id = ? AND year = ?
                `, [application.total_days, application.doctor_id, application.category_id, currentYear]);
            } else {
                // Create new balance record
                const [categoryInfo] = await pool.execute(
                    'SELECT max_days FROM leave_categories WHERE id = ?',
                    [application.category_id]
                );
                
                await pool.execute(`
                    INSERT INTO doctor_leave_balance 
                    (doctor_id, category_id, total_days, used_days, year)
                    VALUES (?, ?, ?, ?, ?)
                `, [application.doctor_id, application.category_id, categoryInfo[0].max_days, application.total_days, currentYear]);
            }
        }

        logger.info(`✅ Leave application ${status} by admin: ${req.user.email} for application ID: ${id}`);

        res.json({
            success: true,
            message: `Leave application ${status} successfully`
        });
    } catch (error) {
        logger.error('Review leave error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to review leave application'
        });
    }
});

// Get all doctors for admin (to view and manage their leave balance)
const getAllDoctors = asyncHandler(async (req, res) => {
    try {
        const [doctors] = await pool.execute(`
            SELECT 
                u.id,
                u.name,
                u.email,
                u.employee_id,
                u.department,
                u.created_at
            FROM users u
            WHERE u.role = 'doctor'
            ORDER BY u.name
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

// Get doctor leave balance by admin - FIXED VERSION
const getDoctorLeaveBalance = asyncHandler(async (req, res) => {
    const { doctorId } = req.params;
    const { year = new Date().getFullYear() } = req.query;

    try {
        logger.info(`🔍 [FIXED-v2] Admin requesting balance for doctor ${doctorId}, year ${year} - NEW CODE ACTIVE`);
        
        // Get doctor details
        const [doctors] = await pool.execute(
            'SELECT id, name, email, employee_id, department FROM users WHERE id = ? AND role = ?',
            [doctorId, 'doctor']
        );

        if (doctors.length === 0) {
            logger.warn(`❌ Doctor not found: ${doctorId}`);
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        logger.info(`✅ Doctor found: ${doctors[0].name} (${doctors[0].employee_id})`);

        // STRICT DATABASE QUERY - Only return records that actually exist
        const [balance] = await pool.execute(`
            SELECT 
                lc.id as category_id,
                lc.name as category_name,
                lb.total_days,
                lb.used_days,
                lb.remaining_days
            FROM doctor_leave_balance lb
            INNER JOIN leave_categories lc ON lb.category_id = lc.id
            WHERE lb.doctor_id = ? AND lb.year = ?
            ORDER BY lc.name
        `, [doctorId, year]);

        logger.info(`📊 [FIXED] STRICT database query returned ${balance.length} records`);
        
        // FORCE EMPTY ARRAY if no records
        const actualBalance = balance || [];
        
        if (actualBalance.length === 0) {
            logger.info(`⚠️ [FIXED] CONFIRMED: No leave allocations in database for doctor ${doctorId} in ${year}`);
        } else {
            actualBalance.forEach(b => {
                logger.info(`📋 [FIXED] ${b.category_name}: ${b.total_days} total, ${b.used_days} used, ${b.remaining_days} remaining`);
            });
        }

        // RETURN ONLY ACTUAL DATABASE DATA
        const response = {
            success: true,
            data: {
                doctor: doctors[0],
                balance: actualBalance,  // This MUST be empty if no records exist
                year: parseInt(year)
            }
        };

        logger.info(`📤 [FIXED-v2] NEW CODE: Sending response with ${actualBalance.length} balance records`);
        
        res.json(response);
    } catch (error) {
        logger.error('Get doctor leave balance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch doctor leave balance'
        });
    }
});

// Set or update doctor leave allocation (admin only)
const setDoctorLeaveAllocation = asyncHandler(async (req, res) => {
    const { doctorId } = req.params;
    const { category_id, total_days, year = new Date().getFullYear() } = req.body;

    try {
        // Validate doctor exists
        const [doctors] = await pool.execute(
            'SELECT id FROM users WHERE id = ? AND role = ?',
            [doctorId, 'doctor']
        );

        if (doctors.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        // Validate category exists
        const [categories] = await pool.execute(
            'SELECT id FROM leave_categories WHERE id = ?',
            [category_id]
        );

        if (categories.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Leave category not found'
            });
        }

        // Check if balance record exists
        const [existingBalance] = await pool.execute(`
            SELECT id, used_days FROM doctor_leave_balance 
            WHERE doctor_id = ? AND category_id = ? AND year = ?
        `, [doctorId, category_id, year]);

        if (existingBalance.length > 0) {
            // Update existing record
            if (total_days < existingBalance[0].used_days) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot set total days less than already used days (${existingBalance[0].used_days})`
                });
            }

            await pool.execute(`
                UPDATE doctor_leave_balance 
                SET total_days = ?, updated_at = CURRENT_TIMESTAMP
                WHERE doctor_id = ? AND category_id = ? AND year = ?
            `, [total_days, doctorId, category_id, year]);
        } else {
            // Create new record
            await pool.execute(`
                INSERT INTO doctor_leave_balance 
                (doctor_id, category_id, total_days, used_days, year)
                VALUES (?, ?, ?, 0, ?)
            `, [doctorId, category_id, total_days, year]);
        }

        logger.info(`✅ Leave allocation updated by admin: ${req.user.email} for doctor: ${doctorId}, category: ${category_id}, days: ${total_days}`);

        res.json({
            success: true,
            message: 'Leave allocation updated successfully'
        });
    } catch (error) {
        logger.error('Set doctor leave allocation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update leave allocation'
        });
    }
});

// Get leave summary for admin dashboard
const getLeaveSummary = asyncHandler(async (req, res) => {
    const { year = new Date().getFullYear() } = req.query;

    try {
        // Get leave applications summary
        const [applicationsSummary] = await pool.execute(`
            SELECT 
                status,
                COUNT(*) as count
            FROM leave_applications 
            WHERE YEAR(applied_at) = ?
            GROUP BY status
        `, [year]);

        // Get category-wise leave usage
        const [categoryUsage] = await pool.execute(`
            SELECT 
                lc.name as category_name,
                SUM(COALESCE(lb.total_days, 0)) as total_allocated,
                SUM(COALESCE(lb.used_days, 0)) as total_used,
                COUNT(DISTINCT lb.doctor_id) as doctors_count
            FROM leave_categories lc
            LEFT JOIN doctor_leave_balance lb ON lc.id = lb.category_id AND lb.year = ?
            GROUP BY lc.id, lc.name
            ORDER BY lc.name
        `, [year]);

        // Get top leave requesters
        const [topRequesters] = await pool.execute(`
            SELECT 
                u.name as doctor_name,
                u.employee_id,
                u.department,
                COUNT(la.id) as applications_count,
                SUM(CASE WHEN la.status = 'approved' THEN la.total_days ELSE 0 END) as approved_days
            FROM users u
            LEFT JOIN leave_applications la ON u.id = la.doctor_id AND YEAR(la.applied_at) = ?
            WHERE u.role = 'doctor'
            GROUP BY u.id, u.name, u.employee_id, u.department
            HAVING applications_count > 0
            ORDER BY approved_days DESC
            LIMIT 10
        `, [year]);

        res.json({
            success: true,
            data: {
                year: parseInt(year),
                applicationsSummary: applicationsSummary.reduce((acc, item) => {
                    acc[item.status] = item.count;
                    return acc;
                }, { pending: 0, approved: 0, rejected: 0 }),
                categoryUsage,
                topRequesters
            }
        });
    } catch (error) {
        logger.error('Get leave summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch leave summary'
        });
    }
});

// Create leave category (admin only)
const createLeaveCategory = asyncHandler(async (req, res) => {
    const { name, max_days, description } = req.body;

    try {
        // Validate input
        if (!name || !max_days) {
            return res.status(400).json({
                success: false,
                message: 'Name and max_days are required'
            });
        }

        if (max_days <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Max days must be greater than 0'
            });
        }

        // Check if category name already exists
        const [existing] = await pool.execute(
            'SELECT id FROM leave_categories WHERE name = ?',
            [name]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Leave category with this name already exists'
            });
        }

        // Create new category
        const [result] = await pool.execute(
            'INSERT INTO leave_categories (name, max_days, description, is_active) VALUES (?, ?, ?, 1)',
            [name, max_days, description || null]
        );

        logger.info(`✅ Leave category created by admin: ${req.user.email} - ${name} (${max_days} days)`);

        res.status(201).json({
            success: true,
            message: 'Leave category created successfully',
            data: {
                id: result.insertId,
                name,
                max_days,
                description
            }
        });
    } catch (error) {
        logger.error('Create leave category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create leave category'
        });
    }
});

// Update leave category (admin only)
const updateLeaveCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, max_days, description } = req.body;

    try {
        // Validate input
        if (!name || !max_days) {
            return res.status(400).json({
                success: false,
                message: 'Name and max_days are required'
            });
        }

        if (max_days <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Max days must be greater than 0'
            });
        }

        // Check if category exists
        const [existing] = await pool.execute(
            'SELECT id FROM leave_categories WHERE id = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Leave category not found'
            });
        }

        // Check if name is taken by another category
        const [nameCheck] = await pool.execute(
            'SELECT id FROM leave_categories WHERE name = ? AND id != ?',
            [name, id]
        );

        if (nameCheck.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Leave category with this name already exists'
            });
        }

        // Update category
        await pool.execute(
            'UPDATE leave_categories SET name = ?, max_days = ?, description = ? WHERE id = ?',
            [name, max_days, description || null, id]
        );

        logger.info(`✅ Leave category updated by admin: ${req.user.email} - ID: ${id}, ${name} (${max_days} days)`);

        res.json({
            success: true,
            message: 'Leave category updated successfully',
            data: {
                id: parseInt(id),
                name,
                max_days,
                description
            }
        });
    } catch (error) {
        logger.error('Update leave category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update leave category'
        });
    }
});

// Delete leave category (admin only)
const deleteLeaveCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
        // Check if category exists
        const [existing] = await pool.execute(
            'SELECT id, name FROM leave_categories WHERE id = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Leave category not found'
            });
        }

        // Check if category is being used in leave applications
        const [applications] = await pool.execute(
            'SELECT COUNT(*) as count FROM leave_applications WHERE category_id = ?',
            [id]
        );

        if (applications[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete category that has been used in leave applications'
            });
        }

        // Check if category is being used in doctor leave balance
        const [balances] = await pool.execute(
            'SELECT COUNT(*) as count FROM doctor_leave_balance WHERE category_id = ?',
            [id]
        );

        if (balances[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete category that has allocated leave balance'
            });
        }

        // Delete category
        await pool.execute('DELETE FROM leave_categories WHERE id = ?', [id]);

        logger.info(`✅ Leave category deleted by admin: ${req.user.email} - ${existing[0].name} (ID: ${id})`);

        res.json({
            success: true,
            message: 'Leave category deleted successfully'
        });
    } catch (error) {
        logger.error('Delete leave category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete leave category'
        });
    }
});

// Deactivate leave category (admin only)
const deactivateLeaveCategory = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;

        // Check if category exists
        const [categories] = await pool.execute(
            'SELECT id, name, is_active FROM leave_categories WHERE id = ?',
            [id]
        );

        if (categories.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Leave category not found'
            });
        }

        const category = categories[0];

        if (category.is_active === 0) {
            return res.status(400).json({
                success: false,
                message: 'Leave category is already inactive'
            });
        }

        // Deactivate category
        await pool.execute(
            'UPDATE leave_categories SET is_active = 0 WHERE id = ?',
            [id]
        );

        logger.info(`✅ Leave category deactivated: ${category.name} (ID: ${id}) by admin: ${req.user.email}`);

        res.json({
            success: true,
            message: 'Leave category deactivated successfully',
            data: {
                category: {
                    id: category.id,
                    name: category.name,
                    is_active: 0
                }
            }
        });
    } catch (error) {
        logger.error('Deactivate leave category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to deactivate leave category'
        });
    }
});

// Activate leave category (admin only)
const activateLeaveCategory = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;

        // Check if category exists
        const [categories] = await pool.execute(
            'SELECT id, name, is_active FROM leave_categories WHERE id = ?',
            [id]
        );

        if (categories.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Leave category not found'
            });
        }

        const category = categories[0];

        if (category.is_active === 1) {
            return res.status(400).json({
                success: false,
                message: 'Leave category is already active'
            });
        }

        // Activate category
        await pool.execute(
            'UPDATE leave_categories SET is_active = 1 WHERE id = ?',
            [id]
        );

        logger.info(`✅ Leave category activated: ${category.name} (ID: ${id}) by admin: ${req.user.email}`);

        res.json({
            success: true,
            message: 'Leave category activated successfully',
            data: {
                category: {
                    id: category.id,
                    name: category.name,
                    is_active: 1
                }
            }
        });
    } catch (error) {
        logger.error('Activate leave category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to activate leave category'
        });
    }
});

module.exports = {
    getLeaveCategories,
    createLeaveCategory,
    updateLeaveCategory,
    deleteLeaveCategory,
    activateLeaveCategory,
    deactivateLeaveCategory,
    applyLeave,
    getMyLeaves,
    getLeaveBalance,
    getAllLeaves,
    reviewLeave,
    getAllDoctors,
    getDoctorLeaveBalance,
    setDoctorLeaveAllocation,
    getLeaveSummary
};
