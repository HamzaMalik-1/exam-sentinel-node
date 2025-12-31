const express = require('express');
const router = express.Router();
// Double check that dropdownController is in ../controllers/
const { getSubjects, getTeachers, getClasses } = require('../controllers/dropdownController');
// Double check the folder name is 'middlewares' (plural)
const { protect } = require('../middlewares/authMiddleware');

router.get('/subjects', getSubjects);
router.get('/teachers', getTeachers);
router.get('/classes', protect, getClasses);

module.exports = router;