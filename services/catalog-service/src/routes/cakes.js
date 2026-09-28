const express = require('express');
const router = express.Router();
const { getAllCakes, getPriceRange, getCakeById, createCake, updateCake, deleteCake } = require('../controllers/cakeController');
const requireSuperAdmin = require('../middleware/requireSuperAdmin');
const requireProductEditor = require('../middleware/requireProductEditor');
const upload = require('../upload');

router.get('/', getAllCakes);
router.get('/price-range', getPriceRange);
router.get('/:id', getCakeById);
router.post('/', requireSuperAdmin, upload.single('image'), createCake);
router.put('/:id', requireProductEditor, upload.single('image'), updateCake);
router.delete('/:id', requireSuperAdmin, deleteCake);

module.exports = router;
