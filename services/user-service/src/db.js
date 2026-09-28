const mysql = require('mysql2/promise');

const config = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'cake_user',
    password: process.env.MYSQL_PASSWORD || 'cake_pass',
    database: process.env.MYSQL_DATABASE || 'user_db',
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true
};

let pool;

const getPool = () => {
    if (!pool) {
        pool = mysql.createPool(config);
    }
    return pool;
};

const initSchema = async () => {
    await getPool().query(`
        CREATE TABLE IF NOT EXISTS users (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            phone VARCHAR(50) NULL,
            address TEXT NULL,
            role ENUM('user', 'admin', 'super_admin') NOT NULL DEFAULT 'user',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await getPool().query(`
        CREATE TABLE IF NOT EXISTS pending_registrations (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            phone VARCHAR(50) NULL,
            address TEXT NULL,
            otp_hash VARCHAR(255) NOT NULL,
            expires_at DATETIME NOT NULL,
            attempts INT NOT NULL DEFAULT 0,
            last_otp_sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_pending_expires_at (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await getPool().query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            user_id BIGINT UNSIGNED NOT NULL,
            token_hash VARCHAR(255) NOT NULL,
            expires_at DATETIME NOT NULL,
            used_at DATETIME NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_password_reset_user_id (user_id),
            INDEX idx_password_reset_expires_at (expires_at),
            CONSTRAINT fk_password_reset_user
                FOREIGN KEY (user_id) REFERENCES users(id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
};

const toUser = (row) => {
    if (!row) return null;
    return {
        _id: String(row.id),
        id: String(row.id),
        name: row.name,
        email: row.email,
        passwordHash: row.password_hash,
        phone: row.phone,
        address: row.address,
        role: row.role,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
};

const toPendingRegistration = (row) => {
    if (!row) return null;
    return {
        _id: String(row.id),
        id: String(row.id),
        name: row.name,
        email: row.email,
        passwordHash: row.password_hash,
        phone: row.phone,
        address: row.address,
        otpHash: row.otp_hash,
        expiresAt: row.expires_at,
        attempts: row.attempts,
        lastOtpSentAt: row.last_otp_sent_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
};

module.exports = { getPool, initSchema, toUser, toPendingRegistration };
