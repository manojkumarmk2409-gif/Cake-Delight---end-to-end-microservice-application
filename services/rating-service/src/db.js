const mysql = require('mysql2/promise');

const config = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'cake_user',
    password: process.env.MYSQL_PASSWORD || 'cake_pass',
    database: process.env.MYSQL_DATABASE || 'rating_db',
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
        CREATE TABLE IF NOT EXISTS ratings (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            cake_id VARCHAR(255) NOT NULL,
            user_id VARCHAR(255) NOT NULL,
            score INT NOT NULL,
            comment VARCHAR(2000) NOT NULL DEFAULT '',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_rating_user_cake (cake_id, user_id),
            INDEX idx_ratings_cake_id (cake_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
};

const toRating = (row) => {
    if (!row) return null;
    return {
        _id: String(row.id),
        id: String(row.id),
        cakeId: row.cake_id,
        userId: row.user_id,
        score: Number(row.score),
        comment: row.comment,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
};

module.exports = { getPool, initSchema, toRating };
