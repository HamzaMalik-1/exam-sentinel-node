const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Helper middleware (optional) to protect routes if you have auth middleware
// const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', userController.getAllUsers);      // Fetch (with filters)
router.post('/', userController.createUser);      // Create
router.put('/:id', userController.updateUser);    // Update
router.delete('/:id', userController.deleteUser); // Soft Delete

module.exports = router;