const express = require('express')
const { signup,sendotp,verifyotp,login } = require('../controllers/authController')


const router = express.Router()

router.post('/signup',signup)
router.post('/sendotp',sendotp)
router.post('/verifyotp',verifyotp)
router.post('/login',login)


module.exports = router