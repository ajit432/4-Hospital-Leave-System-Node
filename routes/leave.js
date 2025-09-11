const express = require('express');
const router = express.Router();
const {
    getLeaveCategories,
    applyLeave,
    getMyLeaves,
    getLeaveBalance,
    getAllLeaves,
    reviewLeave,
    getAllDoctors,
    getDoctorLeaveBalance,
    setDoctorLeaveAllocation,
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

// Admin only routes
router.get('/all', authenticate, adminOnly, getAllLeaves);
router.put('/:id/review', authenticate, adminOnly, validateLeaveReview, reviewLeave);
router.get('/doctors', authenticate, adminOnly, getAllDoctors);
router.get('/doctors/:doctorId/balance', authenticate, adminOnly, getDoctorLeaveBalance);
router.put('/doctors/:doctorId/allocation', authenticate, adminOnly, setDoctorLeaveAllocation);
router.get('/summary', authenticate, adminOnly, getLeaveSummary);

module.exports = router;
