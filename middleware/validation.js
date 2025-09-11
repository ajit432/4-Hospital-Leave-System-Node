const { body, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

// Registration validation
const validateRegistration = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('department')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Department must not exceed 100 characters'),
    body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('Please provide a valid phone number'),
    body('employee_id')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Employee ID is required and must not exceed 50 characters'),
    handleValidationErrors
];

// Login validation
const validateLogin = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    handleValidationErrors
];

// Profile update validation
const validateProfileUpdate = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    body('department')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Department must not exceed 100 characters'),
    body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('Please provide a valid phone number'),
    handleValidationErrors
];

// Password change validation
const validatePasswordChange = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
    handleValidationErrors
];

// Leave application validation
const validateLeaveApplication = [
    body('category_id')
        .isInt({ min: 1 })
        .withMessage('Valid leave category is required'),
    body('start_date')
        .isISO8601()
        .withMessage('Valid start date is required'),
    body('end_date')
        .isISO8601()
        .withMessage('Valid end date is required'),
    body('reason')
        .trim()
        .isLength({ min: 10, max: 500 })
        .withMessage('Reason must be between 10 and 500 characters'),
    handleValidationErrors
];

// Leave review validation (for admin)
const validateLeaveReview = [
    body('status')
        .isIn(['approved', 'rejected'])
        .withMessage('Status must be either approved or rejected'),
    body('admin_comment')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Admin comment must not exceed 500 characters'),
    handleValidationErrors
];

module.exports = {
    validateRegistration,
    validateLogin,
    validateProfileUpdate,
    validatePasswordChange,
    validateLeaveApplication,
    validateLeaveReview,
    handleValidationErrors
};
