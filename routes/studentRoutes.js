// routes/studentRouter.js
const express = require('express');
const router = express.Router();
const { getMyExams, registerInClass, getStudentProfile, getExamInfo, submitExam, getExamForTaking, getMyResults, getResultDetails } = require('../controllers/studentExamController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/my-exams', protect, getMyExams);
router.get('/profile', getStudentProfile);
router.post('/register-class', registerInClass);

router.get('/exam-info/:examId', getExamInfo);
router.get('/take-exam/:id', protect, getExamForTaking);
router.post('/submit-exam', protect, submitExam);
router.get("/my-results", protect, getMyResults);
router.get("/results/:resultId", protect, getResultDetails);
module.exports = router;