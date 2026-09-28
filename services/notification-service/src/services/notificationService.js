const logger = require('../logger');
const { getPool } = require('../db');

const sendNotification = async (data) => {
    const { orderId, userId, totalAmount, items, isPacked, status } = data;
    const normalizedStatus = String(status || '').trim().toLowerCase();
    const formattedTotal = `₹${Math.round(Number(totalAmount || 0))}`;

    let message = '';
    if (normalizedStatus === 'ordered' || normalizedStatus === 'confirmed' || (!normalizedStatus && !isPacked)) {
        message = `🎉 Order #${orderId} confirmed! Total: ${formattedTotal}. Items: ${items.map(i => i.name).join(', ')}`;
    } else if (normalizedStatus === 'packing' || normalizedStatus === 'packed' || isPacked) {
        message = `📦 Your order #${orderId} is being packed and getting ready for delivery!`;
    } else if (normalizedStatus === 'picked_up' || normalizedStatus === 'ready_to_delivery') {
        message = `🎁 Your order #${orderId} has been picked up!`;
    } else if (normalizedStatus === 'out_for_delivery' || normalizedStatus === 'shipped') {
        message = `🚚 Your order #${orderId} is on its way to you!`;
    } else if (normalizedStatus === 'delivered') {
        message = `✅ Your order #${orderId} has been delivered! Enjoy your cakes!`;
    } else if (normalizedStatus === 'cancelled') {
        message = `❌ Your order #${orderId} has been cancelled.`;
    } else {
        message = `Order #${orderId} status updated.`;
    }

    logger.info(`[EMAIL SIMULATION] To: user-${userId}@cakedelight.com | ${message}`);

    const [result] = await getPool().query(
        `INSERT INTO notifications (order_id, user_id, channel, status, message)
         VALUES (?, ?, 'email', 'sent', ?)`,
        [orderId, userId, message]
    );

    logger.info(`Notification created: ${result.insertId} for order ${orderId}`);
    return { id: result.insertId, orderId, userId, message };
};

module.exports = { sendNotification };
