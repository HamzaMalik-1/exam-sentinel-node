const express = require('express');
const router = express.Router();

// Import only the functions that currently exist in your controller
const { signup, login } = require('../controllers/authController');

// --- Auth Routes ---
router.post('/signup', signup);
router.post('/login', login);

// --- OTP Routes (Future Implementation) ---
// Uncomment these lines once you add 'sendotp' and 'verifyotp' to authController.js
// const { sendotp, verifyotp } = require('../controllers/authController');
// router.post('/sendotp', sendotp);
// router.post('/verifyotp', verifyotp);

module.exports = router;