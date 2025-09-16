const express = require('express');
const router = express.Router();
const {
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
    checkDepartmentCoverage,
    getLeaveSummary
} = require('../controllers/leaveController');
const { authenticate, doctorOrAdmin, adminOnly } = require('../middleware/auth');
const { validateLeaveApplication, validateLeaveReview } = require('../middleware/validation');

// Public routes (for authenticated users)
router.get('/categories', authenticate, getLeaveCategories);

// Doctor/Admin routes
router.post('/apply', authenticate, doctorOrAdmin, validateLeaveApplication, applyLeave);
router.get('/my-leaves', authenticate, doctorOrAdmin, getMyLeaves);
router.get('/balance', authenticate, doctorOrAdmin, getLeaveBalance);
router.get('/department-coverage', authenticate, doctorOrAdmin, checkDepartmentCoverage);

// Admin only routes
router.get('/all', authenticate, adminOnly, getAllLeaves);
router.put('/:id/review', authenticate, adminOnly, validateLeaveReview, reviewLeave);
router.get('/doctors', authenticate, adminOnly, getAllDoctors);
router.get('/doctors/:doctorId/balance', authenticate, adminOnly, getDoctorLeaveBalance);
router.put('/doctors/:doctorId/allocation', authenticate, adminOnly, setDoctorLeaveAllocation);
router.get('/summary', authenticate, adminOnly, getLeaveSummary);

// Leave category management (admin only)
router.post('/categories', authenticate, adminOnly, createLeaveCategory);
router.put('/categories/:id', authenticate, adminOnly, updateLeaveCategory);
router.delete('/categories/:id', authenticate, adminOnly, deleteLeaveCategory);
router.put('/categories/:id/activate', authenticate, adminOnly, activateLeaveCategory);
router.put('/categories/:id/deactivate', authenticate, adminOnly, deactivateLeaveCategory);

module.exports = router;
