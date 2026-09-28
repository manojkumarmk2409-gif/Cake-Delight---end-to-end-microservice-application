require('dotenv').config();
const express = require('express');
const { initSchema } = require('./db');
const cartRoutes = require('./routes/cart');
const logger = require('./logger');

const app = express();
app.set('etag', false);
app.use(express.json());

app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

app.get('/health', (req, res) =>
    res.json({ status: 'ok', service: 'cart-service', timestamp: new Date().toISOString() })
);

app.use('/', cartRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, _next) => {
    logger.error(err.stack);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 3006;

const start = async () => {
    if (process.env.NODE_ENV !== 'test') {
        await initSchema();
        logger.info('MySQL connected');
        app.listen(PORT, () => logger.info(`Cart Service running on port ${PORT}`));
    }
};

start().catch(err => { logger.error(err); process.exit(1); });

module.exports = app;
