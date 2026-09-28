const { getPool, toNotification } = require('../db');

const getNotifications = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const [rows] = await getPool().query(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY sent_at DESC',
            [userId]
        );
        const notifications = rows.map(row => toNotification(row));
        res.json({ success: true, data: notifications });
    } catch (err) { next(err); }
};

module.exports = { getNotifications };
