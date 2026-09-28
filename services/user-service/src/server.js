require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const { initSchema, getPool } = require('./db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const logger = require('./logger');

const app = express();
app.use(express.json());

app.get('/health', (req, res) =>
    res.json({ status: 'ok', service: 'user-service', timestamp: new Date().toISOString() })
);

app.use('/auth', authRoutes);
app.use('/users', userRoutes);

app.use((req, res) => {
    logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: 'Not found' });
});
app.use((err, req, res, _next) => {
    logger.error(err.stack);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 3005;

const ensureDefaultUsers = async () => {
    const pool = getPool();
    const adminRows = await pool.query('SELECT id FROM users WHERE email = ?', ['admin@cakedelight.com']);
    if (adminRows[0].length === 0) {
        const passwordHash = await bcrypt.hash('admin123', 10);
        await pool.query(
            `INSERT INTO users (name, email, password_hash, role)
             VALUES (?, ?, ?, 'admin')`,
            ['Admin User', 'admin@cakedelight.com', passwordHash]
        );
        logger.info('Default admin user created: admin@cakedelight.com / admin123');
    }

    const superAdminRows = await pool.query('SELECT id FROM users WHERE email = ?', ['superadmin@cakedelight.com']);
    if (superAdminRows[0].length === 0) {
        const passwordHash = await bcrypt.hash('superadmin123', 10);
        await pool.query(
            `INSERT INTO users (name, email, password_hash, role)
             VALUES (?, ?, ?, 'super_admin')`,
            ['Super Admin User', 'superadmin@cakedelight.com', passwordHash]
        );
        logger.info('Default super admin user created: superadmin@cakedelight.com / superadmin123');
    }
};

const start = async () => {
    if (process.env.NODE_ENV !== 'test') {
        await initSchema();
        logger.info('MySQL connected');
        await ensureDefaultUsers();
        app.listen(PORT, () => logger.info(`User Service running on port ${PORT}`));
    }
};

start().catch(err => { logger.error(err); process.exit(1); });

module.exports = app;
