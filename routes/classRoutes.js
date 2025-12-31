const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');

// Define Routes
router.get('/', classController.getAllClasses);     // Fetch all (paginated/filtered)
router.post('/', classController.createClass);      // Create new
router.put('/:id', classController.updateClass);    // Update existing
router.delete('/:id', classController.deleteClass); // Soft delete

module.exports = router;