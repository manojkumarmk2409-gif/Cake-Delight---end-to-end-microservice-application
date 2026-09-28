const express = require('express');
const router = express.Router();
const { getCart, addItem, updateItem, removeItem, clearCart, testEndpoint } = require('../controllers/cartController');

router.get('/test', testEndpoint);
router.get('/', getCart);
router.post('/items', addItem);
router.put('/items/:cakeId', updateItem);
router.delete('/items/:cakeId', removeItem);
router.delete('/', clearCart);

module.exports = router;
