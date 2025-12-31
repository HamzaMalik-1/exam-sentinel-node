// routes/assignedExamRoutes.js
const express = require('express');
const router = express.Router();
const assignedExamController = require('../controllers/assignedExamController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/', assignedExamController.getAllAssignments);
router.post('/', assignedExamController.assignExam);
router.put('/:id', assignedExamController.updateAssignment);

// ✅ FIX: Bind 'this' so the BaseController can access the model
router.delete('/:id', assignedExamController.delete);
module.exports = router;