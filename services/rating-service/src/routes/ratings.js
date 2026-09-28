const express = require('express');
const router = express.Router();
const { submitRating, getRatings, getAverage } = require('../controllers/ratingController');

router.post('/', submitRating);
router.get('/:cakeId/average', getAverage);
router.get('/:cakeId', getRatings);

module.exports = router;
