const express = require('express');
const router = express.Router();
const { checkout, getOrders, getOrder, updateOrderStatus, cancelOrder } = require('../controllers/orderController');

router.post('/checkout', checkout);
router.get('/', getOrders);
router.get('/:id', getOrder);
router.put('/:id/status', updateOrderStatus);
router.post('/:id/cancel', cancelOrder);

module.exports = router;
