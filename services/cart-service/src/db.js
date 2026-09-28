const mysql = require('mysql2/promise');

const config = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'cake_user',
    password: process.env.MYSQL_PASSWORD || 'cake_pass',
    database: process.env.MYSQL_DATABASE || 'cart_db',
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
        CREATE TABLE IF NOT EXISTS carts (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL UNIQUE,
            items JSON NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
};

const toCart = (row) => {
    if (!row) return null;
    const items = typeof row.items === 'string' ? JSON.parse(row.items || '[]') : (row.items || []);
    return {
        _id: String(row.id),
        id: String(row.id),
        userId: row.user_id,
        items,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        total: items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0)
    };
};

module.exports = { getPool, initSchema, toCart };
