/**
 * Calculate the total amount for a list of order items.
 * @param {Array<{price: number, quantity: number}>} items
 * @returns {number} total amount rounded to 2 decimal places
 */
const calculateTotal = (items) => {
    if (!Array.isArray(items) || items.length === 0) return 0;
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return Math.round(total * 100) / 100;
};

module.exports = { calculateTotal };
