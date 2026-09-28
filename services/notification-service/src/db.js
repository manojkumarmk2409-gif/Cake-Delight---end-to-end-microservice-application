const mysql = require('mysql2/promise');

const config = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'cake_user',
    password: process.env.MYSQL_PASSWORD || 'cake_pass',
    database: process.env.MYSQL_DATABASE || 'notification_db',
    waitForConnections: true,
    connectionLimit: 10
};

let pool;

const getPool = () => {
    if (!pool) pool = mysql.createPool(config);
    return pool;
};

const initSchema = async () => {
    await getPool().query(`
        CREATE TABLE IF NOT EXISTS notifications (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            order_id VARCHAR(255) NOT NULL,
            user_id VARCHAR(255) NOT NULL,
            channel ENUM('email', 'sms', 'in-app') NOT NULL DEFAULT 'email',
            status ENUM('sent', 'failed', 'pending') NOT NULL DEFAULT 'pending',
            message TEXT NOT NULL,
            sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_notifications_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
};

const toNotification = (row) => {
    if (!row) return null;
    return {
        _id: String(row.id),
        id: String(row.id),
        orderId: row.order_id,
        userId: row.user_id,
        channel: row.channel,
        status: row.status,
        message: row.message,
        sentAt: row.sent_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
};

module.exports = { getPool, initSchema, toNotification };
