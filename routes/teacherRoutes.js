// E:\University\Semester 3\Software Engineering\Project\exam-sentinel-server\routes\teacherRoutes.js

const express = require('express');
const router = express.Router();
// const { getClassExamResults } = require('../controllers/');

// ✅ Ensure 'authorize' is included in the destructuring here
const { protect, authorize } = require('../middlewares/authMiddleware'); 
const { getClassExamResults } = require('../controllers/teacherController');

router.get('/exam-results', protect, authorize('teacher', 'admin'), getClassExamResults);

module.exports = router;