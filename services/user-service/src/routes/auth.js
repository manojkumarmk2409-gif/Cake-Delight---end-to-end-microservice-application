const express = require('express');
const router = express.Router();
const {
    register,
    verifyRegistration,
    login,
    logout,
    requestPasswordReset,
    resetPassword
} = require('../controllers/authController');

router.post('/register', register);
router.post('/register/verify', verifyRegistration);
router.post('/login', login);
router.post('/logout', logout);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);

module.exports = router;
