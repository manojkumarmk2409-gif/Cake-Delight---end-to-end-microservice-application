const mysql = require('mysql2/promise');

const config = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'cake_user',
    password: process.env.MYSQL_PASSWORD || 'cake_pass',
    database: process.env.MYSQL_DATABASE || 'catalog_db',
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
        CREATE TABLE IF NOT EXISTS cakes (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            category VARCHAR(255) NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            availability TINYINT(1) NOT NULL DEFAULT 1,
            image_url VARCHAR(1024) NOT NULL DEFAULT '',
            variants_json JSON NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_cakes_category (category),
            INDEX idx_cakes_price (price),
            FULLTEXT KEY ft_cakes_name (name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const [columns] = await getPool().query(
        `
            SELECT COUNT(*) AS count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'cakes'
              AND COLUMN_NAME = 'variants_json'
        `
    );

    if (!columns[0]?.count) {
        await getPool().query(`
            ALTER TABLE cakes
            ADD COLUMN variants_json JSON NULL AFTER image_url
        `);
    }
};

const toCake = (row) => {
    if (!row) return null;
    const variants = (() => {
        if (!row.variants_json) return [];
        if (Array.isArray(row.variants_json)) return row.variants_json;
        if (typeof row.variants_json === 'string') {
            try {
                const parsed = JSON.parse(row.variants_json);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }
        return [];
    })();

    return {
        _id: String(row.id),
        id: String(row.id),
        name: row.name,
        description: row.description,
        category: row.category,
        price: Number(row.price),
        availability: Boolean(row.availability),
        imageUrl: row.image_url,
        variants,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
};

module.exports = { getPool, initSchema, toCake };
