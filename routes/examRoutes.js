const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');

// Main CRUD
router.get('/', examController.getAllExams);
router.post('/', examController.createExam);

router.put('/:id', examController.updateExam);
router.delete('/:id', examController.deleteExam);
router.get('/:id', examController.getExamById);
// AI Generation Route
router.post('/generate-ai', examController.generateAIQuestions);

module.exports = router;