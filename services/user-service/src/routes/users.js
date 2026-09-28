const express = require('express');
const router = express.Router();
const { getMe, updateMe } = require('../controllers/userController');

router.get('/me', getMe);
router.put('/me', updateMe);

module.exports = router;
