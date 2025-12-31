const express = require('express');
const router = express.Router();
const { getSubjects, getTeachers } = require('../controllers/dropdownController');

// Define the routes
router.get('/subjects', getSubjects);
router.get('/teachers', getTeachers);

module.exports = router;