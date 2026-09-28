const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const { calculateTotal } = require('../utils/calculateTotal');
const publisher = require('../rabbitmq/publisher');
const logger = require('../logger');
const { getPool, toOrder, normalizeOrderStatus } = require('../db');

axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

const CART_URL = process.env.CART_SERVICE_URL || 'http://cart-service:3006';
const hasOrderAdminAccess = (role) => ['admin', 'super_admin'].includes(String(role || 'user').toLowerCase());
const trimText = (value) => (typeof value === 'string' ? value.trim() : '');

const checkout = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        let cartResponse;
        try {
            cartResponse = await axios.get(`${CART_URL}/`, { headers: { 'x-user-id': userId } });
        } catch (err) {
            logger.error(`Error fetching cart: ${err.message}`);
            return res.status(500).json({ error: 'Could not fetch cart' });
        }

        const cart = cartResponse.data;
        if (!cart || !cart.items || cart.items.length === 0) {
            return res.status(400).json({ error: 'Cart is empty or not found' });
        }

        const discountCode = trimText(req.body?.discountCode).toUpperCase();
        const address = trimText(req.body?.address);
        if (!address) {
            return res.status(400).json({ error: 'Address is required' });
        }
        if (address.length < 10) {
            return res.status(400).json({ error: 'Address must be at least 10 characters' });
        }
        if (address.length > 240) {
            return res.status(400).json({ error: 'Address must be 240 characters or less' });
        }
        if (discountCode && !/^[A-Z0-9]{3,20}$/.test(discountCode)) {
            return res.status(400).json({ error: 'Invalid discount code' });
        }

        let totalAmount = calculateTotal(cart.items);
        let discount = 0;
        if (discountCode === 'CAKE10') {
            discount = totalAmount * 0.1;
            totalAmount -= discount;
        }

        const pool = getPool();
        const [result] = await pool.query(
            `INSERT INTO orders (user_id, items, total_amount, discount, status, address, status_updated_at)
             VALUES (?, ?, ?, ?, 'confirmed', ?, CURRENT_TIMESTAMP)`,
            [userId, JSON.stringify(cart.items), totalAmount, discount, address]
        );
        const [rows] = await pool.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [result.insertId]);
        const order = toOrder(rows[0]);

        try {
            await axios.delete(`${CART_URL}/`, { headers: { 'x-user-id': userId } });
        } catch (err) {
            logger.error(`Error clearing cart: ${err.message}`);
        }

        publisher.publish('order.completed', { orderId: order._id, userId, totalAmount, items: order.items });
        logger.info(`Order created: ${order._id} for user ${userId}`);

        res.status(201).json({ success: true, data: order });
    } catch (err) { next(err); }
};

const getOrders = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const role = req.headers['x-user-role'];
        const pool = getPool();
        let sql = 'SELECT * FROM orders';
        const params = [];
        if (!hasOrderAdminAccess(role)) {
            sql += ' WHERE user_id = ?';
            params.push(userId);
        }
        sql += ' ORDER BY created_at DESC';
        const [rows] = await pool.query(sql, params);
        res.json({ success: true, data: rows.map(row => toOrder(row)) });
    } catch (err) { next(err); }
};

const getOrder = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const [rows] = await getPool().query('SELECT * FROM orders WHERE id = ? AND user_id = ? LIMIT 1', [req.params.id, userId]);
        const order = toOrder(rows[0]);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json({ success: true, data: order });
    } catch (err) { next(err); }
};

const updateOrderStatus = async (req, res, next) => {
    try {
        const role = req.headers['x-user-role'];
        if (!hasOrderAdminAccess(role)) return res.status(403).json({ error: 'Forbidden' });

        const { status } = req.body;
        const normalizedStatus = normalizeOrderStatus(status);
        const validStatuses = ['confirmed', 'packed', 'ready_to_delivery', 'shipped', 'delivered', 'cancelled', 'ordered', 'packing', 'picked_up', 'out_for_delivery'];
        if (!validStatuses.includes(String(status || '').trim().toLowerCase())) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const [result] = await getPool().query(
            'UPDATE orders SET status = ?, status_updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [normalizedStatus, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found' });

        const [rows] = await getPool().query('SELECT * FROM orders WHERE id = ? LIMIT 1', [req.params.id]);
        const order = toOrder(rows[0]);

        if (normalizedStatus === 'cancelled') {
            publisher.publish('order.cancelled', { orderId: order._id, userId: order.userId });
        } else if (normalizedStatus === 'packed') {
            publisher.publish('order.packed', { orderId: order._id, userId: order.userId, status: normalizedStatus });
        }

        res.json({ success: true, data: order });
    } catch (err) { next(err); }
};

const cancelOrder = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const [rows] = await getPool().query('SELECT * FROM orders WHERE id = ? AND user_id = ? LIMIT 1', [req.params.id, userId]);
        const order = rows[0];
        if (!order) return res.status(404).json({ error: 'Order not found' });

        const normalizedStatus = normalizeOrderStatus(order.status);
        if (['delivered', 'cancelled'].includes(normalizedStatus)) {
            return res.status(400).json({ error: `Cannot cancel order with status: ${normalizedStatus}` });
        }

        const [result] = await getPool().query(
            'UPDATE orders SET status = ?, status_updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['cancelled', req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found' });

        const [updatedRows] = await getPool().query('SELECT * FROM orders WHERE id = ? LIMIT 1', [req.params.id]);
        const updatedOrder = toOrder(updatedRows[0]);

        publisher.publish('order.cancelled', { orderId: updatedOrder._id, userId });
        logger.info(`Order cancelled: ${updatedOrder._id} by user ${userId}`);

        res.json({ success: true, data: updatedOrder });
    } catch (err) { next(err); }
};

module.exports = { checkout, getOrders, getOrder, updateOrderStatus, cancelOrder };
