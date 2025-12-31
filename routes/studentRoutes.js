// routes/studentRouter.js
const express = require('express');
const router = express.Router();
const { getMyExams, registerInClass, getStudentProfile, getExamInfo } = require('../controllers/studentExamController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/my-exams', protect, getMyExams);
router.get('/profile', getStudentProfile);
router.post('/register-class', registerInClass);

router.get('/exam-info/:examId', getExamInfo);

module.exports = router;