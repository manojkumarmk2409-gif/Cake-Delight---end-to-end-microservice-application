require('dotenv').config();
const { getPool, initSchema } = require('./db');
const logger = require('./logger');
const cakes = require('./data/cakes.json');

const seed = async () => {
    await initSchema();
    const pool = getPool();
    for (const cake of cakes) {
        await pool.query(
            `INSERT INTO cakes (name, description, category, price, availability, image_url)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                description = VALUES(description),
                category = VALUES(category),
                price = VALUES(price),
                availability = VALUES(availability),
                image_url = VALUES(image_url)`,
            [
                cake.name,
                cake.description,
                cake.category,
                Number(cake.price),
                cake.availability ? 1 : 0,
                cake.imageUrl || ''
            ]
        );
    }
    logger.info(`Seeded ${cakes.length} cakes`);
};

seed().catch(err => {
    logger.error('Seed error', err);
    process.exit(1);
});
