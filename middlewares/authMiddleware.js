const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require("../utils/AsyncHelper/Async");
const { UnauthorizedError, ForbiddenError } = require("../utils/ErrorHelpers/Errors");

// Middleware to protect routes (Authentication)
const protect = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1]; 
    }

    if (!token) {
        throw new UnauthorizedError('Not authorized to access this route');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            throw new UnauthorizedError('User found in token no longer exists');
        }

        next();
    } catch (error) {
        throw new UnauthorizedError('Token is invalid or expired');
    }
});

// ✅ ADD THIS: Middleware for Role-Based Access Control (Authorization)
const authorize = (...roles) => {
    return (req, res, next) => {
        // req.user is set by the 'protect' middleware which runs first
        if (!req.user || !roles.includes(req.user.role)) {
            // Note: If you don't have ForbiddenError, use a standard error or 403 status
            return res.status(403).json({
                success: false,
                message: `User role ${req.user?.role} is not authorized to access this route`
            });
        }
        next();
    };
};

// ✅ Ensure BOTH are exported in the object
module.exports = { protect, authorize };