const mysql = require('mysql2/promise');

const config = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'cake_user',
    password: process.env.MYSQL_PASSWORD || 'cake_pass',
    database: process.env.MYSQL_DATABASE || 'order_db',
    waitForConnections: true,
    connectionLimit: 10
};

let pool;

const getPool = () => {
    if (!pool) pool = mysql.createPool(config);
    return pool;
};

const ORDER_STATUS_FLOW = ['confirmed', 'packed', 'ready_to_delivery', 'shipped', 'delivered'];
const ORDER_STATUS_ALIASES = {
    ordered: 'confirmed',
    packing: 'packed',
    picked_up: 'ready_to_delivery',
    out_for_delivery: 'shipped'
};

const normalizeOrderStatus = (status) => {
    const value = String(status || '').trim().toLowerCase();
    return ORDER_STATUS_ALIASES[value] || value || 'confirmed';
};

const initSchema = async () => {
    await getPool().query(`
        CREATE TABLE IF NOT EXISTS orders (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            items JSON NOT NULL,
            total_amount DECIMAL(10,2) NOT NULL,
            discount DECIMAL(10,2) NOT NULL DEFAULT 0,
            status ENUM('confirmed', 'packed', 'ready_to_delivery', 'shipped', 'delivered', 'cancelled') NOT NULL DEFAULT 'confirmed',
            address TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            status_updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_orders_user_id (user_id),
            INDEX idx_orders_status (status),
            INDEX idx_orders_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const [columns] = await getPool().query(
        `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'
         AND COLUMN_NAME = 'status_updated_at'`
    );

    if (!columns[0]?.count) {
        try {
            await getPool().query(`
                ALTER TABLE orders ADD COLUMN status_updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            `);
        } catch (e) {
            // Column might already exist
        }
    }

    try {
        await getPool().query(`
            ALTER TABLE orders
            MODIFY COLUMN status ENUM('confirmed', 'packed', 'ready_to_delivery', 'shipped', 'delivered', 'cancelled') NOT NULL DEFAULT 'confirmed'
        `);
    } catch (e) {
        // Ignore if the enum is already compatible or the table is locked during startup.
    }
};

const getAutomaticStatus = (order) => {
    const persistedStatus = normalizeOrderStatus(order.status);
    if (persistedStatus === 'cancelled') {
        return persistedStatus;
    }

    const createdAtTime = new Date(order.created_at).getTime();
    const now = Date.now();
    const elapsedMs = now - createdAtTime;

    const stageDurationMs = 2 * 60 * 1000;

    const stages = [
        { status: 'confirmed', minMs: 0 },
        { status: 'packed', minMs: stageDurationMs * 1 },
        { status: 'ready_to_delivery', minMs: stageDurationMs * 2 },
        { status: 'shipped', minMs: stageDurationMs * 3 },
        { status: 'delivered', minMs: stageDurationMs * 4 }
    ];

    const persistedIndex = ORDER_STATUS_FLOW.indexOf(persistedStatus);
    for (let i = stages.length - 1; i >= 0; i--) {
        if (elapsedMs >= stages[i].minMs) {
            const stageIndex = ORDER_STATUS_FLOW.indexOf(stages[i].status);
            return ORDER_STATUS_FLOW[Math.max(persistedIndex, stageIndex)];
        }
    }

    return ORDER_STATUS_FLOW[Math.max(persistedIndex, 0)];
};

const toOrder = (row) => {
    if (!row) return null;
    const items = typeof row.items === 'string' ? JSON.parse(row.items || '[]') : (row.items || []);
    const automaticStatus = getAutomaticStatus(row);
    return {
        _id: String(row.id),
        id: String(row.id),
        userId: row.user_id,
        items,
        totalAmount: Number(row.total_amount),
        discount: Number(row.discount),
        status: automaticStatus,
        address: row.address,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        statusUpdatedAt: row.status_updated_at
    };
};

module.exports = { getPool, initSchema, toOrder, getAutomaticStatus, normalizeOrderStatus, ORDER_STATUS_FLOW, ORDER_STATUS_ALIASES };
