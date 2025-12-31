const jwt = require('jsonwebtoken'); // ✅ Missing import
const User = require('../models/User'); // ✅ Missing import
const asyncHandler = require("../utils/AsyncHelper/Async");
const { UnauthorizedError } = require("../utils/ErrorHelpers/Errors");

const protect = asyncHandler(async (req, res, next) => {
    let token;

    // 1. Check for the header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        // The split ensures we get the part after "Bearer "
        token = req.headers.authorization.split(' ')[1]; 
    }

    // 2. Verify token exists
    if (!token) {
        throw new UnauthorizedError('Not authorized to access this route');
    }

    try {
        // 3. Verify the token using your secret
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 4. Attach the user to the request object
        // This makes `req.user` available in your controllers
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            throw new UnauthorizedError('User found in token no longer exists');
        }

        next();
    } catch (error) {
        // Handles expired or tampered tokens
        throw new UnauthorizedError('Token is invalid or expired');
    }
});

module.exports = { protect }; // ✅ Export as an object to match your route imports